import { type ReactNode } from "react";
import { SelectionLabel } from "./selection-label.js";
import type { FiberRegistry } from "../fiber/index.js";

/** The consolidated selection label cluster: element type + slot address + climb
 *  arrow (via SelectionLabel) plus trailing affordances. One composite element —
 *  the trailing affordances (action buttons) are passed as children by the shell,
 *  never rendered as standalone overlay elements. The shell decides which trailing
 *  roles a state owns by composing the sub-components below; the cluster itself
 *  carries no visibility booleans. */
function Root({
  registry,
  elementId,
  elementType,
  selectionCount,
  slotAddress,
  onSelectParent,
  commitTick,
  children,
}: {
  registry: FiberRegistry;
  elementId: string;
  elementType: string | undefined;
  selectionCount?: number;
  slotAddress?: string;
  onSelectParent?: () => void;
  commitTick?: number;
  children?: ReactNode;
}) {
  return (
    <SelectionLabel
      registry={registry}
      elementId={elementId}
      elementType={elementType}
      selectionCount={selectionCount}
      slotAddress={slotAddress}
      onSelectParent={onSelectParent}
      commitTick={commitTick}
    >
      {children}
    </SelectionLabel>
  );
}

const PencilIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M9.5 1.5 11.5 3.5 4 11 1.5 11.5 2 9 9.5 1.5Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

function Edit({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-role="action-edit"
      className="label-action-btn"
      aria-label="Edit props"
      onClick={onClick}
    >
      <PencilIcon />
      <span className="action-bar-tooltip" role="tooltip">
        Edit props
      </span>
    </button>
  );
}

function Insert({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-role="action-insert"
      className="label-action-btn"
      aria-label="Insert"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      +
      <span className="action-bar-tooltip" role="tooltip">
        Insert
      </span>
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
      aria-label="Toggle box model"
      onClick={onToggle}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.8" />
        <rect x="3" y="3" width="4" height="4" />
      </svg>
      <span className="action-bar-tooltip" role="tooltip">
        Box model
      </span>
    </button>
  );
}

export const SelectionCluster = { Root, Edit, Insert, BoxModel };
