import { useEffect, type RefObject } from "react";
import {
  useFloating,
  offset,
  shift,
  autoUpdate,
  useMergeRefs,
} from "@floating-ui/react";
import type { Middleware } from "@floating-ui/react";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { rectsOverlap } from "../layout/rect.js";
import css from "./selection.css?inline";

const ZERO_RECT: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};

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

  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => {
        const el = registry.get(elementId);
        return el?.getBoundingClientRect() ?? ZERO_RECT;
      },
    });
  }, [refs, registry, elementId]);

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
