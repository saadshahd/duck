import { useEffect, useRef } from "react";
import { useShadowSheet } from "../overlay/index.js";
import css from "./selection.css?inline";

/** Rendered by the shell only in the `slot-selected` pointer state.
 *  Draws a 2px outline band around the measured slot rect and floats
 *  a focusable label button at the top-left corner that climbs to the
 *  parent element on click (same action as ↑). */
export function SlotStop({
  rect,
  label,
  onClimb,
}: {
  rect: DOMRect;
  label: string;
  onClimb: () => void;
}) {
  useShadowSheet(css);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <>
      <div
        data-role="slot-stop"
        className="slot-stop"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
      <button
        ref={btnRef}
        type="button"
        data-role="slot-stop-label"
        className="slot-stop-label"
        style={{ top: rect.top, left: rect.left }}
        onClick={onClimb}
        aria-label={`Slot: ${label}. Press to select parent element.`}
      >
        {label}
      </button>
    </>
  );
}
