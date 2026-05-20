import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import type { ComponentData, Config, Metadata } from "@puckeditor/core";
import type { Resolver } from "../resolve-config.js";
import { expectErr, expectOk } from "../testing/result.js";
import { invokeResolver } from "./invoke-resolver.js";

type ComponentConfig = NonNullable<Config["components"][string]>;

const component = (
  id: string,
  props: Record<string, unknown> = {},
): ComponentData =>
  ({
    type: "Box",
    props: { id, ...props },
  }) as ComponentData;

const render: ComponentConfig["render"] = () => createElement("div");

const config = (
  resolveData?: Resolver,
  metadata?: Metadata,
): Config =>
  ({
    components: {
      Box: {
        render,
        ...(resolveData && { resolveData }),
        ...(metadata && { metadata }),
      },
    },
  });

describe("invokeResolver", () => {
  test("merges returned props over existing props", async () => {
    const node = component("box", { title: "Draft" });
    const resolved = expectOk(await invokeResolver({
      config: config(() => ({ props: { title: "Resolved", slug: "x" } })),
      node,
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    }));

    expect(resolved.props).toEqual({
      id: "box",
      title: "Resolved",
      slug: "x",
    });
  });

  test("replaces readOnly only when resolver returns a non-empty map", async () => {
    const node = {
      ...component("box", { title: "Draft" }),
      readOnly: { title: true },
    } as ComponentData;
    const empty = await invokeResolver({
      config: config(() => ({ readOnly: {} })),
      node,
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    });
    const replaced = await invokeResolver({
      config: config(() => ({ readOnly: { slug: true } })),
      node,
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    });

    expect(expectOk(empty).readOnly).toEqual({ title: true });
    expect(expectOk(replaced).readOnly).toEqual({ slug: true });
  });

  test("passes changed keys, previous input, metadata, trigger, and parent", async () => {
    const parent = component("parent");
    const lastData = component("box", { title: "Old", count: 1 });
    const node = component("box", { title: "New", count: 1 });
    const fn = () => "from-host";
    const seen: unknown[] = [];
    const resolver: Resolver = (_data, params) => {
      seen.push(params);
      return { props: {} };
    };

    await invokeResolver({
      config: config(resolver, { source: "component" }),
      node,
      parent,
      lastData,
      metadata: { source: "host", fn },
      trigger: "move",
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      changed: { id: false, title: true, count: false },
      metadata: { source: "component", fn },
      trigger: "move",
    });
    expect((seen[0] as { lastData: ComponentData }).lastData).toEqual(lastData);
    expect((seen[0] as { parent: ComponentData }).parent).toEqual(parent);
    expect(
      ((seen[0] as { metadata: { fn: typeof fn } }).metadata.fn),
    ).toBe(fn);
  });

  test("captures sync throws and async rejects", async () => {
    const thrown = await invokeResolver({
      config: config(() => {
        throw new Error("sync");
      }),
      node: component("box"),
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    });
    const rejected = await invokeResolver({
      config: config(async () => Promise.reject(new Error("async"))),
      node: component("box"),
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    });

    expect(expectErr(thrown).kind).toBe("resolver-failed");
    expect(expectErr(rejected).kind).toBe("resolver-failed");
  });

  test("exposes cloned inputs to resolver code", async () => {
    const parent = component("parent", { label: "Parent" });
    const lastData = component("box", { title: "Old" });
    const node = component("box", { title: "New" });
    const resolver: Resolver = (data, params) => {
      data.props.title = "Mutated";
      if (params.parent) params.parent.props.label = "Mutated";
      if (params.lastData) params.lastData.props.title = "Mutated";
      return { props: {} };
    };

    await invokeResolver({
      config: config(resolver),
      node,
      parent,
      lastData,
      metadata: {},
      trigger: "replace",
    });

    expect(node.props.title).toBe("New");
    expect(parent.props.label).toBe("Parent");
    expect(lastData.props.title).toBe("Old");
  });

  test("returns an unserializable-input error when cloning fails", async () => {
    const result = await invokeResolver({
      config: config(() => ({ props: {} })),
      node: component("box", { fn: () => "nope" }),
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    });

    expect(expectErr(result)).toMatchObject({
      kind: "unserializable-input",
      id: "box",
    });
  });

  test("returns the original node when no resolver exists", async () => {
    const node = component("box");
    const result = await invokeResolver({
      config: config(),
      node,
      parent: null,
      lastData: null,
      metadata: {},
      trigger: "replace",
    });

    expect(expectOk(result)).toBe(node);
  });
});
