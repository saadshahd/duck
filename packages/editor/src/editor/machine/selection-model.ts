export type SelectionState = {
  selectedIds: ReadonlySet<string>;
  lastSelectedId: string | null;
};

const EMPTY: SelectionState = {
  selectedIds: new Set<string>(),
  lastSelectedId: null,
};

export const Selection = {
  of: (elementId: string): SelectionState => ({
    selectedIds: new Set([elementId]),
    lastSelectedId: elementId,
  }),

  clear: (): SelectionState => EMPTY,

  toggle: (state: SelectionState, elementId: string): SelectionState => {
    const next = new Set(state.selectedIds);
    if (next.has(elementId)) {
      next.delete(elementId);
      return { selectedIds: next, lastSelectedId: state.lastSelectedId };
    }
    next.add(elementId);
    return { selectedIds: next, lastSelectedId: elementId };
  },

  collapseToLast: (state: SelectionState): SelectionState =>
    state.lastSelectedId ? Selection.of(state.lastSelectedId) : EMPTY,

  wouldEmpty: (state: SelectionState, elementId: string): boolean =>
    state.selectedIds.size === 1 && state.selectedIds.has(elementId),

  ofSet: (elementIds: string[]): SelectionState =>
    elementIds.length === 0
      ? EMPTY
      : {
          selectedIds: new Set(elementIds),
          lastSelectedId: elementIds.at(-1)!,
        },

  reconcile: (
    state: SelectionState,
    validIds: ReadonlySet<string>,
  ):
    | { type: "DESELECT" }
    | { type: "REPLACE_SELECT"; elementIds: string[] }
    | null => {
    if (state.selectedIds.size === 0) return null;
    const surviving = [...state.selectedIds].filter((id) => validIds.has(id));
    if (surviving.length === state.selectedIds.size) return null;
    if (surviving.length === 0) return { type: "DESELECT" };
    // Preserve lastSelectedId by placing it last (Selection.ofSet uses .at(-1))
    const last =
      state.lastSelectedId && validIds.has(state.lastSelectedId)
        ? state.lastSelectedId
        : surviving.at(-1)!;
    const ordered = [...surviving.filter((id) => id !== last), last];
    return { type: "REPLACE_SELECT", elementIds: ordered };
  },
} as const;
