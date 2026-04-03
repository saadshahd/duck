import { useCallback, useEffect, useState } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import { isFromShadowDom } from "../fiber/index.js";

export type MenuState = {
  x: number;
  y: number;
  elementIds: string[];
} | null;

const resolveElementIds = (
  registry: FiberRegistry,
  x: number,
  y: number,
): string[] => [
  ...new Set(
    document
      .elementsFromPoint(x, y)
      .map((el) => registry.getNodeId(el))
      .filter((id): id is string => id !== undefined),
  ),
];

export function useContextMenu(registry: FiberRegistry | null) {
  const [menu, setMenu] = useState<MenuState>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const close = useCallback(() => {
    setMenu(null);
    setHighlightId(null);
  }, []);

  useEffect(
    function wireContextMenu() {
      if (!registry) return;

      const onContextMenu = (e: MouseEvent) => {
        if (isFromShadowDom(e)) return;

        const elementIds = resolveElementIds(registry, e.clientX, e.clientY);
        if (elementIds.length === 0) return;

        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, elementIds });
        setHighlightId(null);
      };

      document.addEventListener("contextmenu", onContextMenu);
      return () => document.removeEventListener("contextmenu", onContextMenu);
    },
    [registry],
  );

  return { menu, close, highlightId, setHighlightId };
}
