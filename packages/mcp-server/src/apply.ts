import { Effect } from "effect";
import {
  applySpecPatch,
  validateSpec,
  autoFixSpec,
  type Spec,
} from "@json-render/core";
import type { McpContext } from "./protocol.js";
import { PatchError } from "./errors.js";
import { readSpecOrDraft } from "./query/read-spec-or-draft.js";

type PatchOp = {
  readonly op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  readonly path: string;
  readonly value?: unknown;
  readonly from?: string;
};

type ApplyArgs = {
  readonly page: string;
  readonly patches: readonly PatchOp[];
};

export const applyPatches = (ctx: McpContext, args: ApplyArgs) =>
  Effect.gen(function* () {
    const base = yield* readSpecOrDraft(ctx.storage, args.page);
    const spec = structuredClone(base);

    yield* applySequentially(spec, args.patches);

    const { valid, issues } = validateSpec(spec);
    const warnings = issues.map((i) => i.message);
    const { spec: final, fixes } = valid
      ? { spec, fixes: [] }
      : autoFixSpec(spec);

    yield* ctx.storage.writeDraft(args.page, final);

    return {
      applied: true,
      opCount: args.patches.length,
      ...(warnings.length > 0 ? { warnings } : {}),
      ...(fixes.length > 0 ? { fixes } : {}),
    };
  });

const applySequentially = (spec: Spec, patches: readonly PatchOp[]) =>
  Effect.forEach(patches, (patch, i) =>
    Effect.try({
      try: () => applySpecPatch(spec, patch),
      catch: (err) =>
        new PatchError({
          message: err instanceof Error ? err.message : String(err),
          failedOpIndex: i,
        }),
    }),
  );
