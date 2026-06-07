import { type RefObject, type ReactNode } from "react";
import { SelectionLabel } from "./selection-label.js";
import type { FiberRegistry } from "../fiber/index.js";

/** The consolidated selection label cluster: element type + slot address + climb
 *  arrow (via SelectionLabel) plus trailing affordances. One composite element —
 *  the trailing affordances (Move chip, box-model toggle) are passed as children
 *  by the shell, never rendered as standalone overlay elements. The shell decides
 *  which trailing roles a state owns by composing the sub-components below; the
 *  cluster itself carries no visibility booleans. */
function Root({
  registry,
  elementId,
  elementType,
  selectionCount,
  slotAddress,
  toolbarRef,
  onSelectParent,
  children,
}: {
  registry: FiberRegistry;
  elementId: string;
  elementType: string | undefined;
  selectionCount?: number;
  slotAddress?: string;
  toolbarRef: RefObject<HTMLElement | null>;
  onSelectParent?: () => void;
  children?: ReactNode;
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
      {children}
    </SelectionLabel>
  );
}

function Move({ onMove }: { onMove: () => void }) {
  return (
    <button
      type="button"
      data-role="move-chip"
      className="move-chip"
      aria-keyshortcuts="Space"
      onClick={onMove}
    >
      ⤢ Move
    </button>
  );
}

function BoxModel({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-role="box-model-toggle"
      className={`label-action-btn${active ? " label-action-btn--active" : ""}`}
      onClick={onToggle}
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
  );
}

export const SelectionCluster = { Root, Move, BoxModel };
