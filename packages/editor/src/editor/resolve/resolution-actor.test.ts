import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import type { ComponentData, Config, Data, Metadata } from "@puckeditor/core";
import { err, ok } from "neverthrow";
import { expectOk } from "../testing/result.js";
import {
  transition,
  type ResolutionContext,
  type ResolutionEvent,
} from "./resolution-actor.js";

type ComponentConfig = NonNullable<Config["components"][string]>;
type ResolverProps = (metadata: Metadata) => Record<string, unknown>;

const component = (
  type: string,
  id: string,
  props: Record<string, unknown> = {},
): ComponentData =>
  ({
    type,
    props: { id, ...props },
  }) as ComponentData;

const data = (...content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

const render: ComponentConfig["render"] = () => createElement("div");

const componentConfig = (resolve: ResolverProps): ComponentConfig => ({
  render,
  resolveData: (_node, params) => ({
    props: resolve(params.metadata),
  }),
});

const config = (
  resolvers: Record<string, ResolverProps> = { Box: () => ({}) },
): Config =>
  ({
    components: Object.fromEntries(
      Object.entries(resolvers).map(([type, resolve]) => [
        type,
        componentConfig(resolve),
      ]),
    ) as Config["components"],
  });

const context = (
  applyResolution: ResolutionContext["applyResolution"] = () => {},
): ResolutionContext => ({
  epoch: 0,
  versionCounters: new Map(),
  inflight: new Map(),
  inputCache: new Map(),
  resolvingIds: new Set(),
  errorIds: new Set(),
  applyResolution,
});

const op = (
  overrides: Partial<Extract<ResolutionEvent, { type: "OP" }>> = {},
): Extract<ResolutionEvent, { type: "OP" }> => ({
  type: "OP",
  op: { type: "update", id: "box", trigger: "replace" },
  entryId: "entry",
  data: data(component("Box", "box")),
  config: config(),
  metadata: {},
  ...overrides,
});

describe("resolution actor", () => {
  test("unknown ids and nodes without resolvers no-op", () => {
    const ctx = context();
    expect(
      transition(
        ctx,
        op({ op: { type: "update", id: "missing", trigger: "replace" } }),
      ),
    ).toBe(ctx);
    expect(
      transition(
        ctx,
        op({
          data: data(component("Text", "text")),
          op: { type: "update", id: "text", trigger: "replace" },
        }),
      ),
    ).toBe(ctx);
  });

  test("queues resolver-bearing ids with fresh Map and Set values", () => {
    const ctx = context();
    const next = transition(ctx, op());

    expect(next).not.toBe(ctx);
    expect(next.versionCounters).not.toBe(ctx.versionCounters);
    expect(next.inflight).not.toBe(ctx.inflight);
    expect(next.inputCache).not.toBe(ctx.inputCache);
    expect(next.resolvingIds).not.toBe(ctx.resolvingIds);
    expect(next.errorIds).not.toBe(ctx.errorIds);
    expect(next.versionCounters.get("box")).toBe(1);
    expect(next.inflight.get("box")).toEqual({ epoch: 0, version: 1 });
    expect(next.inputCache.get("box")).toEqual(component("Box", "box"));
    expect(next.resolvingIds.has("box")).toBe(true);
  });

  test("force queues parallel resolver-bearing ids", () => {
    const next = transition(
      context(),
      op({
        op: { type: "force", ids: ["a", "b"], trigger: "force" },
        data: data(component("Box", "a"), component("Text", "b")),
        config: config({ Box: () => ({}), Text: () => ({}) }),
      }),
    );

    expect([...next.resolvingIds].sort()).toEqual(["a", "b"]);
    expect(next.versionCounters.get("a")).toBe(1);
    expect(next.versionCounters.get("b")).toBe(1);
  });

  test("same-id supersession increments versions and caches latest input", () => {
    const first = transition(context(), op());
    const secondNode = component("Box", "box", { title: "latest" });
    const second = transition(first, op({ data: data(secondNode) }));

    expect(second.versionCounters.get("box")).toBe(2);
    expect(second.inflight.get("box")).toEqual({ epoch: 0, version: 2 });
    expect(second.inputCache.get("box")).toEqual(secondNode);
  });

  test("remove cleans transient state without resetting version counters", () => {
    const queued = transition(context(), op());
    const next = transition(queued, {
      type: "OP",
      op: { type: "remove", ids: ["box"] },
      entryId: "entry",
      data: data(),
      config: config(),
      metadata: {},
    });

    expect(next.versionCounters.get("box")).toBe(1);
    expect(next.inflight.has("box")).toBe(false);
    expect(next.inputCache.has("box")).toBe(false);
    expect(next.resolvingIds.has("box")).toBe(false);
    expect(next.errorIds.has("box")).toBe(false);
  });

  test("reset increments epoch and clears transient state", () => {
    const queued = transition(context(), op());
    const next = transition(queued, { type: "RESET" });

    expect(next.epoch).toBe(1);
    expect(next.versionCounters.get("box")).toBe(1);
    expect(next.inflight.size).toBe(0);
    expect(next.inputCache.size).toBe(0);
    expect(next.resolvingIds.size).toBe(0);
    expect(next.errorIds.size).toBe(0);
  });

  test("settled applies only the current epoch and version", () => {
    const calls: unknown[] = [];
    const queued = transition(context((patch) => calls.push(patch)), op());
    const input = queued.inputCache.get("box")!;
    const stale = transition(queued, {
      type: "SETTLED",
      epoch: 0,
      id: "box",
      version: 2,
      entryId: "entry",
      inputAtResolveTime: input,
      result: ok(component("Box", "box", { resolved: true })),
    });
    const next = transition(
      queued,
      {
        type: "SETTLED",
        epoch: 0,
        id: "box",
        version: 1,
        entryId: "entry",
        inputAtResolveTime: input,
        result: ok(component("Box", "box", { resolved: true })),
      },
      { defer: (fn) => fn(), send: () => {} },
    );

    expect(stale).toBe(queued);
    expect(calls).toHaveLength(1);
    expect(next.resolvingIds.has("box")).toBe(false);
    expect(next.errorIds.has("box")).toBe(false);
  });

  test("settled errors mark the id and leave history untouched", () => {
    const calls: unknown[] = [];
    const queued = transition(context((patch) => calls.push(patch)), op());
    const input = queued.inputCache.get("box")!;
    const next = transition(queued, {
      type: "SETTLED",
      epoch: 0,
      id: "box",
      version: 1,
      entryId: "entry",
      inputAtResolveTime: input,
      result: err({ kind: "resolver-failed", id: "box", cause: "nope" }),
    });

    expect(calls).toHaveLength(0);
    expect(next.resolvingIds.has("box")).toBe(false);
    expect(next.errorIds.has("box")).toBe(true);
  });

  test("OP events use their own config and metadata", async () => {
    const sent: ResolutionEvent[] = [];
    transition(
      context(),
      op({
        config: config({ Box: (metadata) => ({ value: metadata.value }) }),
        metadata: { value: "event" },
      }),
      { defer: (fn) => fn(), send: (event) => sent.push(event) },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const result = (
      sent[0] as Extract<ResolutionEvent, { type: "SETTLED" }>
    ).result;
    expect(expectOk(result).props.value).toBe("event");
  });
});
