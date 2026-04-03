import { type RefObject } from "react";
import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import type { Middleware } from "@floating-ui/react";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { rectsOverlap } from "../layout/rect.js";
import css from "./selection.css?inline";

const FALLBACKS: import("@floating-ui/react").Placement[] = [
  "top-end",
  "bottom-start",
  "bottom-end",
];

const avoidElement = (ref: RefObject<HTMLElement | null>): Middleware => ({
  name: "avoidElement",
  fn({ x, y, rects, middlewareData }) {
    const attempt: number = middlewareData.avoidElement?.attempt ?? 0;
    if (attempt >= FALLBACKS.length) return {};
    const el = ref.current;
    if (!el) return {};
    const obstacle = el.getBoundingClientRect();
    const floating = new DOMRect(
      x,
      y,
      rects.floating.width,
      rects.floating.height,
    );
    if (!rectsOverlap(floating, obstacle)) return {};
    return {
      data: { attempt: attempt + 1 },
      reset: { placement: FALLBACKS[attempt] },
    };
  },
});

export function SelectionLabel({
  registry,
  elementId,
  elementType,
  toolbarRef,
  onSelectParent,
}: {
  registry: FiberRegistry;
  elementId: string;
  elementType: string | undefined;
  toolbarRef: RefObject<HTMLElement | null>;
  onSelectParent?: () => void;
}) {
  useShadowSheet(css);

  const middleware = [
    offset(({ placement }) => (placement.startsWith("bottom") ? -1 : 2)),
    avoidElement(toolbarRef),
    shift({ padding: 8 }),
  ];

  const { refs, floatingStyles, placement } = useFloating({
    placement: "top-start",
    middleware,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, elementId);

  if (!elementType) return null;

  const side = placement.startsWith("bottom") ? "bottom" : "top";

  return (
    <div
      ref={refs.setFloating}
      className="selection-label-root"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      <span
        data-side={side}
        className={`element-label${onSelectParent ? " element-label--interactive" : ""}`}
        onClick={onSelectParent}
      >
        {onSelectParent && <span className="element-label__arrow">↑</span>}
        {elementType}
      </span>
    </div>
  );
}
