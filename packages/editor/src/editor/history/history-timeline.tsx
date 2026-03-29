import { useState, useCallback, useRef } from "react";
import { useFloating, offset, shift, arrow } from "@floating-ui/react";
import { useShadowSheet } from "../overlay/index.js";
import { computeDotSize } from "./fisheye.js";
import type { Snapshot } from "./types.js";
import css from "./history-timeline.css?inline";

type HistoryTimelineProps = {
  entries: readonly Snapshot[];
  currentIndex: number;
  visibilityState: string;
  onRestore: (index: number) => void;
  onRename: (index: number, name: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const TOOLTIP_MIDDLEWARE = [offset(10), shift({ padding: 8 })];

// React synthetic mouseenter/mouseleave are unreliable inside shadow DOM
// (composed: false per spec, browser-inconsistent). Use mouseover/mouseout
// with relatedTarget filtering instead — these bubble and are composed: true.
const useHoverTracking = (
  railRef: React.RefObject<HTMLDivElement | null>,
  onEnter: () => void,
  onLeave: () => void,
) => {
  const handleOver = useCallback(
    (e: React.MouseEvent) => {
      const related = e.relatedTarget as Node | null;
      if (!related || !railRef.current?.contains(related)) {
        onEnter();
      }
    },
    [railRef, onEnter],
  );

  const handleOut = useCallback(
    (e: React.MouseEvent) => {
      const related = e.relatedTarget as Node | null;
      if (!related || !railRef.current?.contains(related)) {
        onLeave();
      }
    },
    [railRef, onLeave],
  );

  return { onMouseOver: handleOver, onMouseOut: handleOut };
};

export function HistoryTimeline({
  entries,
  currentIndex,
  visibilityState,
  onRestore,
  onRename,
  onMouseEnter,
  onMouseLeave,
}: HistoryTimelineProps) {
  useShadowSheet(css);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const hoverHandlers = useHoverTracking(railRef, onMouseEnter, onMouseLeave);

  const { refs, floatingStyles, middlewareData, placement } = useFloating({
    placement: "top",
    middleware: [...TOOLTIP_MIDDLEWARE, arrow({ element: arrowRef })],
  });

  const handleDotEnter = useCallback(
    (index: number, el: HTMLButtonElement) => {
      setHoveredIndex(index);
      refs.setPositionReference(el);
    },
    [refs],
  );

  const handleDotLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const hoveredEntry =
    hoveredIndex !== null ? entries[hoveredIndex] : undefined;

  const arrowX = middlewareData.arrow?.x;
  const arrowSide = placement === "bottom" ? "top" : "bottom";

  return (
    <div
      ref={railRef}
      className="timeline-rail"
      data-role="timeline-rail"
      data-visibility={visibilityState}
      {...hoverHandlers}
    >
      {entries.map((entry, index) => {
        const size = computeDotSize(index, currentIndex);
        const position =
          index < currentIndex
            ? "past"
            : index === currentIndex
              ? "current"
              : "future";

        return (
          <button
            key={`${index}-${entry.timestamp}`}
            type="button"
            className="timeline-dot"
            style={{ width: size, height: size }}
            {...{ [`data-${position}`]: "" }}
            {...(entry.name ? { "data-named": "" } : {})}
            onClick={() => onRestore(index)}
            onMouseEnter={(e) => handleDotEnter(index, e.currentTarget)}
            onMouseLeave={handleDotLeave}
            onContextMenu={(e) => {
              e.preventDefault();
              const name = prompt("Rename entry:", entry.name ?? entry.label);
              if (name?.trim()) onRename(index, name.trim());
            }}
          />
        );
      })}
      <div
        ref={refs.setFloating}
        className="timeline-tooltip"
        data-visible={hoveredEntry ? "" : undefined}
        style={floatingStyles}
      >
        {hoveredEntry && (hoveredEntry.name ?? hoveredEntry.label)}
        <div
          ref={arrowRef}
          className="timeline-tooltip-arrow"
          style={{
            left: arrowX != null ? `${arrowX}px` : undefined,
            [arrowSide]: "-4px",
          }}
        />
      </div>
    </div>
  );
}
