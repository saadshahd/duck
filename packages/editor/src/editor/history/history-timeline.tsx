import { useCallback, useContext, useRef } from "react";
import { TooltipTrigger, Tooltip } from "react-aria-components";
import { useShadowSheet, PortalContext } from "../overlay/index.js";
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
  const portalContainer = useContext(PortalContext);
  const railRef = useRef<HTMLDivElement>(null);
  const hoverHandlers = useHoverTracking(railRef, onMouseEnter, onMouseLeave);

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
          <TooltipTrigger
            key={`${index}-${entry.timestamp}`}
            delay={0}
            closeDelay={0}
          >
            <button
              type="button"
              className="timeline-dot"
              style={{ width: size, height: size }}
              {...{ [`data-${position}`]: "" }}
              {...(entry.name ? { "data-named": "" } : {})}
              onClick={() => onRestore(index)}
              onContextMenu={(e) => {
                e.preventDefault();
                const name = prompt("Rename entry:", entry.name ?? entry.label);
                if (name?.trim()) onRename(index, name.trim());
              }}
            />
            <Tooltip
              className="timeline-tooltip"
              placement="top"
              UNSTABLE_portalContainer={portalContainer ?? undefined}
            >
              {entry.name ?? entry.label}
            </Tooltip>
          </TooltipTrigger>
        );
      })}
    </div>
  );
}
