import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { NO_TARGET_LABEL, type DropTarget } from "../layout/index.js";
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
  noTargetFlash: { x: number; y: number } | null;
};

/** The single polite live-region message for the editor. Precedence: an active
 *  drag (cycle-prefixed while cycling) wins, then — during carry — an invalid-click
 *  echo over the carry destination status, then a selected slot stop. Empty string
 *  when nothing is announceable — callers must not announce a blank message. */
export const announcerMessage = ({
  data,
  drag,
  pointer,
  dropTarget,
  carryTarget,
  cycleStatus,
  slotAddress,
  noTargetFlash,
}: Args): string => {
  if (drag === "dragging" && dropTarget) {
    const label = announcementFor(data, dropTarget);
    return cycleStatus
      ? `Destination ${cycleStatus.step} of ${cycleStatus.total}: ${label}`
      : label;
  }
  if (drag === "carrying") {
    if (noTargetFlash) return NO_TARGET_LABEL;
    if (carryTarget) return announcementFor(data, carryTarget);
  }
  if (pointer === "slot-selected" && slotAddress)
    return `Slot ${slotAddress} selected`;
  return "";
};

type AssertiveArgs = {
  data: Data;
  drag: string;
  dragSourceId: string | null;
};

/** Assertive live-region message for carry mode entry/exit. Emitted on a second
 *  Announcer instance (assertive region) so the mode announcement interrupts, but
 *  only on mode change — it never churns on the polite no-target flash. Returns
 *  empty string when not carrying. */
export const assertiveCarryMessage = ({
  data,
  drag,
  dragSourceId,
}: AssertiveArgs): string => {
  if (drag !== "carrying") return "";
  if (!dragSourceId) return "";
  const sourceType = findById(data, dragSourceId)?.type ?? "element";
  return `Moving ${sourceType}. Click or press Enter to drop, Esc to cancel.`;
};
