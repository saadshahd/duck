import type { Data } from "@puckeditor/core";
import {
  useShadowSheet,
  useSlotStopRect,
  useAutoFocus,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { slotChildAt } from "../layout/index.js";
import css from "./selection.css?inline";

const NO_FOCUS = { current: null };

/** A 2px outline band around a slot's measured rect with a focusable corner
 *  label. The rect tracks live (scroll + layout shifts) on the same
 *  animationFrame cadence as the selection ring.
 *
 *  Two roles, by `active`:
 *  - active slot: the label climbs to the parent element (onClimb) and the band
 *    hosts an inline insert (+) wired to the insert flow targeting that slot. A
 *    click in the band's padding keeps the slot (onChoose); a click landing on a
 *    child selects that child (onSelectChild) — what looks inside acts inside.
 *  - sibling slots: the whole band is a hit-target that re-chooses the slot
 *    (onChoose) — the slot-choice step. No (+); the chosen slot gets it. */
export function SlotStop({
  registry,
  data,
  parentId,
  slotKey,
  label,
  active,
  onClimb,
  onChoose,
  onSelectChild,
  onInsert,
}: {
  registry: FiberRegistry;
  data: Data;
  parentId: string;
  slotKey: string;
  label: string;
  active: boolean;
  onClimb: () => void;
  onChoose: () => void;
  onSelectChild: (childId: string) => void;
  onInsert?: () => void;
}) {
  useShadowSheet(css);
  const { bandRef, labelRef } = useSlotStopRect({
    registry,
    data,
    parentId,
    slotKey,
  });
  useAutoFocus(active ? labelRef : NO_FOCUS);

  return (
    <>
      <div
        ref={bandRef}
        data-role="slot-stop"
        data-active={active || undefined}
        className={
          active
            ? "slot-stop slot-stop--active"
            : "slot-stop slot-stop--choosable"
        }
        onClick={(e) => {
          e.stopPropagation();
          if (!active) {
            onChoose();
            return;
          }
          const childId = slotChildAt({
            data,
            parentId,
            slotKey,
            registry,
            point: { x: e.clientX, y: e.clientY },
          });
          if (childId) onSelectChild(childId);
          else onChoose();
        }}
      >
        {active && onInsert && (
          <button
            type="button"
            data-role="slot-insert-btn"
            className="slot-insert-btn"
            aria-label="Insert into slot"
            onClick={(e) => {
              e.stopPropagation();
              onInsert();
            }}
          >
            +
          </button>
        )}
      </div>
      <button
        ref={labelRef}
        type="button"
        data-role="slot-stop-label"
        data-active={active || undefined}
        className="slot-stop-label"
        onClick={(e) => {
          e.stopPropagation();
          (active ? onClimb : onChoose)();
        }}
        aria-label={
          active
            ? `Slot: ${label}. Press to select parent element.`
            : `Slot: ${label}. Press to insert here.`
        }
      >
        {label}
      </button>
    </>
  );
}
