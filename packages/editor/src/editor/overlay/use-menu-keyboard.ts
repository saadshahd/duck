import { useEffect, useRef, useState } from "react";

const HANDLED = new Set(["Escape", "ArrowDown", "ArrowUp", "Enter"]);

export function useMenuKeyboard(deps: {
  count: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  onHover?: (index: number) => void;
}): { activeIndex: number; setActiveIndex: (i: number) => void } {
  const { count, onSelect, onClose, onHover } = deps;
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIndexRef = useRef(-1);

  useEffect(
    function wireMenuKeyboard() {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!HANDLED.has(e.key)) return;
        e.preventDefault();
        e.stopImmediatePropagation();

        if (e.key === "Escape") {
          onClose();
          return;
        }
        if (e.key === "ArrowDown") {
          const next =
            activeIndexRef.current < count - 1 ? activeIndexRef.current + 1 : 0;
          activeIndexRef.current = next;
          setActiveIndex(next);
          onHover?.(next);
          return;
        }
        if (e.key === "ArrowUp") {
          const next =
            activeIndexRef.current > 0 ? activeIndexRef.current - 1 : count - 1;
          activeIndexRef.current = next;
          setActiveIndex(next);
          onHover?.(next);
          return;
        }
        if (e.key === "Enter" && activeIndexRef.current >= 0) {
          onSelect(activeIndexRef.current);
        }
      };

      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    },
    [count, onSelect, onClose, onHover],
  );

  const updateActiveIndex = (i: number) => {
    activeIndexRef.current = i;
    setActiveIndex(i);
  };

  return { activeIndex, setActiveIndex: updateActiveIndex };
}
