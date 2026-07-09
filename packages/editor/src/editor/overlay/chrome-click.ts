import type { MouseEventHandler } from "react";

/** Chrome-click hygiene for every overlay button. Canvas selection lives on a
 *  document-level click listener that hit-tests the pointer; an action that
 *  unmounts its own button mid-dispatch (edit opens the sheet, delete removes
 *  the element, moving to the last slot unmounts the very arrow just clicked,
 *  an array-slot child row closes the sheet to select on the canvas) detaches
 *  it, so the bubbled click would fail the "from shadow DOM?" guard and
 *  re-select whatever canvas element sits beneath the button. Stopping here —
 *  synchronously, before the unmount — keeps every chrome click off that
 *  listener. Every overlay control routes through this one guard so no chrome
 *  control can diverge from it. */
export const chromeClick =
  (onClick: () => void): MouseEventHandler<HTMLButtonElement> =>
  (e) => {
    e.stopPropagation();
    onClick();
  };
