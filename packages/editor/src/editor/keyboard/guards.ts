import type { Data } from "@puckeditor/core";

export type NavContext = {
  data: Data;
  lastSelectedId: string | null;
  pointer: string;
};

// --- Pure nav predicates (no DOM, no keyboard library) ---

export const selected = (nav: NavContext): boolean =>
  nav.pointer === "selected" && nav.lastSelectedId !== null;

export const notEditing = (nav: NavContext): boolean =>
  nav.pointer !== "editing";

/** Insert is reachable wherever a destination is already established: a selected
 *  element (slot-choice or sibling) or an already-chosen slot. */
export const insertable = (nav: NavContext): boolean =>
  (nav.pointer === "selected" || nav.pointer === "slot-selected") &&
  nav.lastSelectedId !== null;

/** The editor owns Escape only when there is something to dismiss: a selection,
 *  an open sheet/picker, or a chosen slot. Otherwise Escape passes to the browser. */
export const isDismissible = (nav: NavContext): boolean =>
  nav.pointer === "editing" ||
  nav.pointer === "inserting" ||
  nav.pointer === "slot-selected" ||
  selected(nav);

/** Tab/Shift+Tab should be intercepted when the editor is in an idle or
 *  hovering state and focus is not inside an editable field. Tab in those
 *  states selects the first or next/previous element in tree order. */
export const tabNavigable = (nav: NavContext): boolean =>
  nav.pointer !== "editing" && nav.pointer !== "inserting";
