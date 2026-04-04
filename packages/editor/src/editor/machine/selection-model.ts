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
} as const;
