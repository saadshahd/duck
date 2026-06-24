export type EditorAction =
  | { tag: "insert" }
  | { tag: "move-up" }
  | { tag: "move-down" }
  | { tag: "delete" }
  | { tag: "edit" };
