import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import type { DropTarget } from "../layout/index.js";
import { announcementFor } from "../drag/index.js";

type CycleStatus = { step: number; total: number };

type Args = {
  data: Data;
  drag: string;
  pointer: string;
  dropTarget: DropTarget | null;
  carryTarget: DropTarget | null;
  cycleStatus: CycleStatus | null;
  slotAddress: string | undefined;
};

/** The single polite live-region message for the editor. Precedence: an active
 *  drag (cycle-prefixed while cycling) wins, then a carry, then a selected slot
 *  stop. Empty string when nothing is announceable — callers must not announce
 *  a blank message. */
export const announcerMessage = ({
  data,
  drag,
  pointer,
  dropTarget,
  carryTarget,
  cycleStatus,
  slotAddress,
}: Args): string => {
  if (drag === "dragging" && dropTarget) {
    const label = announcementFor(data, dropTarget);
    return cycleStatus
      ? `Destination ${cycleStatus.step} of ${cycleStatus.total}: ${label}`
      : label;
  }
  if (drag === "carrying" && carryTarget)
    return announcementFor(data, carryTarget);
  if (pointer === "slot-selected" && slotAddress)
    return `Slot ${slotAddress} selected`;
  return "";
};

type AssertiveArgs = {
  data: Data;
  drag: string;
  dragSourceId: string | null;
  noTargetFlash: { x: number; y: number } | null;
};

/** Assertive live-region message for mode-entry and invalid-click echo. Emitted
 *  on a second Announcer instance (assertive region) so it doesn't interfere
 *  with the polite destination announcements. Returns empty string when silent. */
export const assertiveCarryMessage = ({
  data,
  drag,
  dragSourceId,
  noTargetFlash,
}: AssertiveArgs): string => {
  if (drag !== "carrying") return "";
  if (noTargetFlash) return "No target here";
  if (!dragSourceId) return "";
  const sourceType = findById(data, dragSourceId)?.type ?? "element";
  return `Moving ${sourceType}. Click or press Enter to drop, Esc to cancel.`;
};
