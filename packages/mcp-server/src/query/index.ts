import { Effect } from "effect";
import type { Data } from "@puckeditor/core";
import type { McpContext } from "../protocol.js";
import type { Bridge } from "../bridge/index.js";
import { QueryError } from "../errors.js";
import { readDataOrDraft } from "./read-spec-or-draft.js";
import { outline } from "./outline.js";
import { element } from "./element.js";
import { subtree } from "./subtree.js";
import { typeQuery } from "./type-query.js";
import { search } from "./search.js";
import { selection } from "./selection.js";
import { capture } from "./capture.js";

type QueryArgs = {
  readonly what: string;
  readonly page?: string;
  readonly id?: string;
  readonly depth?: number;
  readonly componentType?: string;
  readonly q?: string;
};

const dataModes: Record<
  string,
  (data: Data, args: QueryArgs) => Effect.Effect<unknown, QueryError>
> = {
  outline: (data, args) => outline(data, args.depth),
  element: (data, args) =>
    requireParam(args.id, "id").pipe(Effect.andThen((id) => element(data, id))),
  subtree: (data, args) =>
    requireParam(args.id, "id").pipe(Effect.andThen((id) => subtree(data, id))),
  type: (data, args) =>
    requireParam(args.componentType, "componentType").pipe(
      Effect.andThen((t) => typeQuery(data, t)),
    ),
  search: (data, args) =>
    requireParam(args.q, "q").pipe(Effect.andThen((q) => search(data, q))),
};

const bridgeModes: Record<
  string,
  (bridge: Bridge, page: string) => Effect.Effect<unknown, QueryError>
> = {
  selection: (bridge, page) => selection(bridge, page),
  capture: (bridge, page) => capture(bridge, page),
};

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

export const dispatchQuery = (ctx: McpContext, args: QueryArgs) => {
  const dataHandler = dataModes[args.what];
  if (dataHandler)
    return requirePage(args.page).pipe(
      Effect.andThen((page) => readDataOrDraft(ctx.storage, page)),
      Effect.andThen((data) => dataHandler(data, args)),
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
