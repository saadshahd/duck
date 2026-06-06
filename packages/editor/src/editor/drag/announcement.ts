import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { resolveLabel, type DropTarget } from "../layout/index.js";

/** Derive the aria-live announcement string for the active drop target. */
export const announcementFor = (data: Data, target: DropTarget): string => {
  const label = resolveLabel(data, target);
  if (!label) return "";
  if (target.kind !== "line") return label;
  const siblingType = findById(data, target.elementId)?.type ?? "";
  const position =
    target.edge === "top" || target.edge === "left" ? "before" : "after";
  return `${label} — ${position} ${siblingType}`;
};
