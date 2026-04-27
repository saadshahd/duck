import type { Data } from "@puckeditor/core";
import { findParent } from "../spec-ops/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

export function createSelectParent(
  data: Data,
  lastSelectedId: string | null,
  send: Send,
): (() => void) | undefined {
  if (!lastSelectedId) return undefined;
  return () => {
    const parent = findParent(data, lastSelectedId);
    if (parent && parent.parentId !== null) {
      send({ type: "SELECT", elementId: parent.parentId });
    } else {
      send({ type: "DESELECT" });
    }
  };
}
