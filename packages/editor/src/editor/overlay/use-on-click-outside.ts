import { useEffect } from "react";

export function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(
    function clickOutside() {
      const onPointerDown = (e: PointerEvent) => {
        if (ref.current && !e.composedPath().includes(ref.current)) {
          onClose();
        }
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    },
    [ref, onClose],
  );
}
