import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { resolveLabel, type DropTarget } from "../layout/index.js";

/** Which side of the sibling a line edge inserts on. */
export const edgePosition = (edge: Edge): "before" | "after" =>
  edge === "top" || edge === "left" ? "before" : "after";

/** Derive the aria-live announcement string for the active drop target. */
export const announcementFor = (data: Data, target: DropTarget): string => {
  const label = resolveLabel(data, target);
  if (!label) return "";
  if (target.kind !== "line") return label;
  const siblingType = findById(data, target.elementId)?.type;
  if (!siblingType) return label;
  return `${label} — ${edgePosition(target.edge)} ${siblingType}`;
};
