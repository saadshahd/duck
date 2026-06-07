import type { Data } from "@puckeditor/core";
import {
  useShadowSheet,
  useSlotStopRect,
  useAutoFocus,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import css from "./selection.css?inline";

/** A 2px outline band around a slot's measured rect with a focusable corner
 *  label. The rect tracks live (scroll + layout shifts) on the same
 *  animationFrame cadence as the selection ring; the label climbs to the
 *  parent element on click. An optional inline insert (+) button sits inside
 *  the band when onInsert is provided — the shell wires it to the insert flow
 *  targeting that slot. */
export function SlotStop({
  registry,
  data,
  parentId,
  slotKey,
  label,
  onClimb,
  onInsert,
}: {
  registry: FiberRegistry;
  data: Data;
  parentId: string;
  slotKey: string;
  label: string;
  onClimb: () => void;
  onInsert?: () => void;
}) {
  useShadowSheet(css);
  const { bandRef, labelRef } = useSlotStopRect({
    registry,
    data,
    parentId,
    slotKey,
  });
  useAutoFocus(labelRef);

  return (
    <>
      <div ref={bandRef} data-role="slot-stop" className="slot-stop">
        {onInsert && (
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
        className="slot-stop-label"
        onClick={onClimb}
        aria-label={`Slot: ${label}. Press to select parent element.`}
      >
        {label}
      </button>
    </>
  );
}
