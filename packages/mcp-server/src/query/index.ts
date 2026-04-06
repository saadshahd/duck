import { Effect } from "effect";
import type { Spec } from "@json-render/core";
import type { McpContext, BridgeHandle } from "../protocol.js";
import { QueryError } from "../errors.js";
import { readSpecOrDraft } from "./read-spec-or-draft.js";
import { outline } from "./outline.js";
import { element } from "./element.js";
import { subtree } from "./subtree.js";
import { typeQuery } from "./type-query.js";
import { search } from "./search.js";
import { selection } from "./selection.js";
import { capture } from "./capture.js";
import { catalog } from "./catalog.js";

type QueryArgs = {
  readonly what: string;
  readonly page?: string;
  readonly id?: string;
  readonly depth?: number;
  readonly componentType?: string;
  readonly q?: string;
};

// ── Mode tables ───────────────────────────────────────────────────

const specModes: Record<
  string,
  (spec: Spec, args: QueryArgs) => Effect.Effect<unknown, QueryError>
> = {
  outline: (spec, args) => outline(spec, args.depth),
  element: (spec, args) =>
    requireParam(args.id, "id").pipe(Effect.andThen((id) => element(spec, id))),
  subtree: (spec, args) =>
    requireParam(args.id, "id").pipe(Effect.andThen((id) => subtree(spec, id))),
  type: (spec, args) =>
    requireParam(args.componentType, "componentType").pipe(
      Effect.andThen((t) => typeQuery(spec, t)),
    ),
  search: (spec, args) =>
    requireParam(args.q, "q").pipe(Effect.andThen((q) => search(spec, q))),
};

const bridgeModes: Record<
  string,
  (bridge: BridgeHandle, page: string) => Effect.Effect<unknown, QueryError>
> = {
  selection: (bridge, page) => selection(bridge, page),
  capture: (bridge, page) => capture(bridge, page),
};

// ── Helpers ───────────────────────────────────────────────────────

const requireParam = (
  value: string | undefined,
  name: string,
): Effect.Effect<string, QueryError> =>
  value
    ? Effect.succeed(value)
    : Effect.fail(
        new QueryError({ message: `${name} is required for this query mode` }),
      );

const requirePage = (page: string | undefined) => requireParam(page, "page");

// ── Dispatch ──────────────────────────────────────────────────────

export const dispatchQuery = (ctx: McpContext, args: QueryArgs) => {
  if (args.what === "catalog") return catalog(ctx.catalog);

  const specHandler = specModes[args.what];
  if (specHandler)
    return requirePage(args.page).pipe(
      Effect.andThen((page) => readSpecOrDraft(ctx.storage, page)),
      Effect.andThen((spec) => specHandler(spec, args)),
    );

  const bridgeHandler = bridgeModes[args.what];
  if (bridgeHandler)
    return requirePage(args.page).pipe(
      Effect.andThen((page) => bridgeHandler(ctx.bridge, page)),
    );

  return Effect.fail(
    new QueryError({ message: `Unknown query mode: ${args.what}` }),
  );
};
