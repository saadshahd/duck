import type { Data } from "@puckeditor/core";
import { findParent } from "../spec-ops/index.js";
import { Target, type EditorEvent } from "../machine/index.js";

type Send = (event: EditorEvent) => void;

export function createSelectParent(
  data: Data,
  selectedElementId: string | null,
  send: Send,
): (() => void) | undefined {
  if (!selectedElementId) return undefined;
  return () => {
    const parent = findParent(data, selectedElementId);
    if (parent && parent.parentId !== null) {
      send({ type: "SELECT", target: Target.element(parent.parentId) });
    } else {
      send({ type: "DESELECT" });
    }
  };
}
