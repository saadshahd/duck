import { useEffect, useState } from "react";

const HANDLED = new Set(["Escape", "ArrowDown", "ArrowUp", "Enter"]);

export function useMenuKeyboard(deps: {
  count: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}): { activeIndex: number; setActiveIndex: (i: number) => void } {
  const { count, onSelect, onClose } = deps;
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(
    function wireMenuKeyboard() {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!HANDLED.has(e.key)) return;
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown")
          setActiveIndex(activeIndex < count - 1 ? activeIndex + 1 : 0);
        if (e.key === "ArrowUp")
          setActiveIndex(activeIndex > 0 ? activeIndex - 1 : count - 1);
        if (e.key === "Enter" && activeIndex >= 0) onSelect(activeIndex);
      };

      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    },
    [activeIndex, count, onSelect, onClose],
  );

  return { activeIndex, setActiveIndex };
}
