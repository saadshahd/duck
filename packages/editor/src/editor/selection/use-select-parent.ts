import type { Spec } from "@json-render/core";
import { findParent } from "../spec-ops/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

export function createSelectParent(
  spec: Spec,
  lastSelectedId: string | null,
  send: Send,
): (() => void) | undefined {
  if (!lastSelectedId) return undefined;
  return () => {
    const parent = findParent(spec, lastSelectedId);
    if (parent.isOk()) {
      send({ type: "SELECT", elementId: parent.value.parentId });
    } else {
      send({ type: "DESELECT" });
    }
  };
}
