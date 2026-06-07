import { type RefObject } from "react";
import { SelectionLabel } from "./selection-label.js";
import type { FiberRegistry } from "../fiber/index.js";

/** The consolidated selection label cluster: element type + slot address + climb
 *  arrow (via SelectionLabel) plus the trailing Move chip and box-model toggle.
 *  One composite element — the trailing affordances are state-gated by the shell
 *  through `showMove` / `showBoxModel`, never rendered as standalone overlay
 *  elements. */
export function SelectionCluster({
  registry,
  elementId,
  elementType,
  selectionCount,
  slotAddress,
  toolbarRef,
  onSelectParent,
  showMove,
  showBoxModel,
  boxModelActive,
  onMove,
  onToggleBoxModel,
}: {
  registry: FiberRegistry;
  elementId: string;
  elementType: string | undefined;
  selectionCount?: number;
  slotAddress?: string;
  toolbarRef: RefObject<HTMLElement | null>;
  onSelectParent?: () => void;
  showMove: boolean;
  showBoxModel: boolean;
  boxModelActive: boolean;
  onMove: () => void;
  onToggleBoxModel: () => void;
}) {
  return (
    <SelectionLabel
      registry={registry}
      elementId={elementId}
      elementType={elementType}
      selectionCount={selectionCount}
      slotAddress={slotAddress}
      toolbarRef={toolbarRef}
      onSelectParent={onSelectParent}
    >
      {showMove && (
        <button
          type="button"
          data-role="move-chip"
          className="move-chip"
          aria-keyshortcuts="Space"
          onClick={onMove}
        >
          ⤢ Move
        </button>
      )}
      {showBoxModel && (
        <button
          type="button"
          data-role="box-model-toggle"
          className={`label-action-btn${boxModelActive ? " label-action-btn--active" : ""}`}
          onClick={onToggleBoxModel}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.8" />
            <rect x="3" y="3" width="4" height="4" />
          </svg>
        </button>
      )}
    </SelectionLabel>
  );
}
