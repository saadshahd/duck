/** A selectable node in the document tree.
 *  Elements are component instances with an id; slots are named regions of a
 *  parent component with no id of their own.
 *
 *  Mirrors the editor-side `Target` so the bridge protocol can carry one shape. */
export type Target =
  | { readonly kind: "element"; readonly elementId: string }
  | { readonly kind: "slot"; readonly parentId: string; readonly slotKey: string };
