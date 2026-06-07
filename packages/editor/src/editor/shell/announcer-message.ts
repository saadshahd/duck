import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import {
  NO_TARGET_LABEL,
  type CycleStatus,
  type DropTarget,
} from "../layout/index.js";
import { announcementFor } from "../drag/index.js";

type Args = {
  data: Data;
  drag: string;
  pointer: string;
  dropTarget: DropTarget | null;
  carryTarget: DropTarget | null;
  cycleStatus: CycleStatus | null;
  carryCycleStatus: CycleStatus | null;
  slotAddress: string | undefined;
  noTargetFlash: { x: number; y: number } | null;
};

/** The single polite live-region message for the editor. Precedence: an active
 *  drag (cycle-prefixed while cycling) wins, then — during carry — an invalid-click
 *  echo over the carry destination status (cycle-prefixed while cycling), then a
 *  selected slot stop. Empty string when nothing is announceable. */
export const announcerMessage = ({
  data,
  drag,
  pointer,
  dropTarget,
  carryTarget,
  cycleStatus,
  carryCycleStatus,
  slotAddress,
  noTargetFlash,
}: Args): string => {
  if (drag === "dragging" && dropTarget) {
    const label = announcementFor(data, dropTarget);
    return cycleStatus?.phase === "stepping"
      ? `Destination ${cycleStatus.step} of ${cycleStatus.total}: ${label}`
      : label;
  }
  if (drag === "carrying") {
    if (noTargetFlash) return NO_TARGET_LABEL;
    if (carryTarget) {
      const label = announcementFor(data, carryTarget);
      return carryCycleStatus?.phase === "stepping"
        ? `Destination ${carryCycleStatus.step} of ${carryCycleStatus.total}: ${label}`
        : label;
    }
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
 *  only on mode change — it never churns on the polite no-target flash. Names the
 *  Tab/Shift+Tab cycling mechanism so screen-reader users know how to cycle
 *  destinations without needing to discover it. Returns empty string when not
 *  carrying. */
export const assertiveCarryMessage = ({
  data,
  drag,
  dragSourceId,
}: AssertiveArgs): string => {
  if (drag !== "carrying") return "";
  if (!dragSourceId) return "";
  const sourceType = findById(data, dragSourceId)?.type ?? "element";
  return `Moving ${sourceType}. Tab or Shift+Tab to cycle destinations. Click or press Enter to drop, Esc to cancel.`;
};
