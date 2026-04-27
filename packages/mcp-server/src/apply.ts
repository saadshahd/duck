import { Effect } from "effect";
import type { Data } from "@puckeditor/core";
import { outlineTree, preOrder } from "@json-render-editor/spec";
import type { McpContext } from "./protocol.js";
import type { InvalidPageName, NotFound, StorageError } from "./errors.js";
import { applyOp, type Op, type OpError } from "./ops.js";
import { readSpecOrDraft } from "./query/read-spec-or-draft.js";

export type ApplyArgs = {
  readonly page: string;
  readonly ops: readonly Op[];
};

export type ProgressNotice = {
  readonly value: number;
  readonly total?: number;
  readonly message?: string;
};

type OpFailure = {
  readonly tag: OpError["tag"];
  readonly details: Record<string, unknown>;
};

type ApplyResult =
  | {
      readonly ok: true;
      readonly summary: {
        readonly total: number;
        readonly topLevel: number;
        readonly types: Record<string, number>;
      };
      readonly outline: ReturnType<typeof outlineTree>;
    }
  | {
      readonly ok: false;
      readonly failedOpIndex: number;
      readonly error: OpFailure;
    };

const emptyData: Data = { root: { props: {} }, content: [] };

const readOrCreate = (ctx: McpContext, page: string) =>
  readSpecOrDraft(ctx.storage, page).pipe(
    Effect.catchTag("NotFound", () =>
      ctx.storage.writeSpec(page, emptyData).pipe(Effect.map(() => emptyData)),
    ),
  );

const summarize = (data: Data) => {
  const types: Record<string, number> = {};
  let total = 0;
  for (const { component } of preOrder(data)) {
    types[component.type] = (types[component.type] ?? 0) + 1;
    total++;
  }
  return { total, topLevel: data.content.length, types };
};

export const applyOps = (
  ctx: McpContext,
  args: ApplyArgs,
  notifyProgress: (n: ProgressNotice) => void,
): Effect.Effect<ApplyResult, NotFound | StorageError | InvalidPageName> =>
  Effect.gen(function* () {
    const base = yield* readOrCreate(ctx, args.page);
    let current: Data = base;
    const total = args.ops.length;

    for (let i = 0; i < total; i++) {
      const op = args.ops[i]!;
      const result = yield* applyOp(current, op, ctx.config).pipe(
        Effect.either,
      );
      if (result._tag === "Left") {
        const err = result.left;
        notifyProgress({
          value: i,
          total,
          message: `op ${i} failed: ${err.tag}`,
        });
        return {
          ok: false,
          failedOpIndex: i,
          error: { tag: err.tag, details: err.details },
        } as const;
      }
      current = result.right;
      yield* ctx.storage.writeDraft(args.page, current);
      ctx.bridge.broadcast(args.page, current);
      notifyProgress({
        value: i + 1,
        total,
        message: `op ${i} ok`,
      });
    }

    return {
      ok: true,
      summary: summarize(current),
      outline: outlineTree(current, 2),
    } as const;
  });
