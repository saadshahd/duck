import type { Target as SpecTarget } from "@duckeditor/spec";

/** A selectable node in the document tree.
 *  Elements are component instances with an id; slots are named regions of a
 *  parent component with no id of their own.
 *
 *  Re-exports the structural type from `@duckeditor/spec` and pairs it with
 *  editor-side helpers. */
export type Target = SpecTarget;

export const Target = {
  element: (elementId: string): Target => ({ kind: "element", elementId }),
  slot: (parentId: string, slotKey: string): Target => ({
    kind: "slot",
    parentId,
    slotKey,
  }),

  elementId: (t: Target | null): string | null =>
    t?.kind === "element" ? t.elementId : null,

  equals: (a: Target | null, b: Target | null): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.kind !== b.kind) return false;
    if (a.kind === "element" && b.kind === "element")
      return a.elementId === b.elementId;
    if (a.kind === "slot" && b.kind === "slot")
      return a.parentId === b.parentId && a.slotKey === b.slotKey;
    return false;
  },
} as const;
