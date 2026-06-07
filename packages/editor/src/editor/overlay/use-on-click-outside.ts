import { useEffect } from "react";

/** Close a floating overlay when a pointerdown lands outside it. The closing
 *  press also swallows the `click` it begets — captured once on the document —
 *  so dismissing the overlay never doubles as a background select/deselect.
 *  Without this, clicking away to close a picker would also clear the very
 *  selection the picker was anchored to. */
export function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(
    function clickOutside() {
      const onPointerDown = (e: PointerEvent) => {
        if (!ref.current || e.composedPath().includes(ref.current)) return;
        // Swallow the click this press begets. The listener self-removes on the
        // first event and lives on the document independent of this component:
        // onClose typically unmounts the overlay, which would otherwise run this
        // effect's cleanup and drop the swallow before the click ever fired.
        const swallow = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          document.removeEventListener("click", swallow, { capture: true });
        };
        document.addEventListener("click", swallow, { capture: true });
        onClose();
      };

      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    },
    [ref, onClose],
  );
}
