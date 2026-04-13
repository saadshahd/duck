import { Effect } from "effect";
import {
  applySpecPatch,
  deepMergeSpec,
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
  readonly patches?: readonly PatchOp[];
  readonly spec?: Record<string, unknown>;
};

const emptySpec: Spec = { root: "", elements: {} };

const readOrCreate = (ctx: McpContext, page: string) =>
  readSpecOrDraft(ctx.storage, page).pipe(
    Effect.catchTag("NotFound", () =>
      ctx.storage.writeSpec(page, emptySpec).pipe(Effect.map(() => emptySpec)),
    ),
  );

const mergeSpec = (base: Spec, partial: Record<string, unknown>) =>
  Effect.try({
    try: () => deepMergeSpec(base as Record<string, unknown>, partial) as Spec,
    catch: (err) =>
      new PatchError({
        message: err instanceof Error ? err.message : String(err),
      }),
  });

const patchSpec = (base: Spec, patches: readonly PatchOp[]) => {
  const clone = structuredClone(base);
  return applySequentially(clone, patches).pipe(Effect.map(() => clone));
};

/** What the agent needs to orient after an apply: what's on the page now. */
const summarize = (spec: Spec) => {
  const root = spec.elements[spec.root];
  const sections = (root?.children ?? [])
    .map((id) => spec.elements[id]?.type)
    .filter(Boolean);

  return { total: Object.keys(spec.elements).length, sections };
};

export const applyPatches = (ctx: McpContext, args: ApplyArgs) =>
  Effect.gen(function* () {
    const base = yield* readOrCreate(ctx, args.page);

    const spec = yield* args.spec
      ? mergeSpec(base, args.spec)
      : patchSpec(base, args.patches ?? []);

    const { valid, issues } = validateSpec(spec);
    const warnings = issues.map((i) => i.message);
    const { spec: final, fixes } = valid
      ? { spec, fixes: [] }
      : autoFixSpec(spec);

    yield* ctx.storage.writeDraft(args.page, final);
    ctx.bridge.broadcast(args.page, final);

    return {
      applied: true,
      mode: args.spec ? "merge" : "patch",
      livePreview: true,
      summary: summarize(final),
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
