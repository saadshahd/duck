import type { Data } from "@puckeditor/core";
import { findParent } from "@duckeditor/spec";
import { Target } from "../machine/index.js";

/** Walk one step up the selection chain.
 *  - Element with a slot-bearing parent → the enclosing slot Target.
 *  - Slot Target → the parent element Target.
 *  - Top-level element → null (selection clears). */
export const parentTarget = (
  data: Data,
  target: Target,
): Target | null => {
  if (target.kind === "slot") return Target.element(target.parentId);
  const parent = findParent(data, target.elementId);
  if (!parent || parent.parentId === null || parent.slotKey === null)
    return null;
  return Target.slot(parent.parentId, parent.slotKey);
};

type EscapeNav = {
  data: Data;
  selection: Target | null;
  pointer: string;
};

type EscapeEvent =
  | { type: "ESCAPE" }
  | { type: "SELECT"; target: Target };

/** Esc semantics: cancel transient modes; otherwise walk one step up the
 *  selection ladder, falling back to clear at the top. */
export const nextEscapeEvent = (nav: EscapeNav): EscapeEvent => {
  if (nav.pointer === "selected" && nav.selection) {
    const next = parentTarget(nav.data, nav.selection);
    if (next) return { type: "SELECT", target: next };
  }
  return { type: "ESCAPE" };
};
