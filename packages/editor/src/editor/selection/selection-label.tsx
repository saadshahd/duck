import { type ReactNode } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import css from "./selection.css?inline";
import { CommitFlash } from "./commit-flash.js";

const MIDDLEWARE = [
  offset(({ placement }) => (placement.startsWith("bottom") ? -1 : 2)),
  flip({ fallbackPlacements: ["top-end", "bottom-start", "bottom-end"] }),
  shift({ padding: 8 }),
];

export function SelectionLabel({
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
  useShadowSheet(css);

  const { refs, floatingStyles, placement } = useFloating({
    placement: "top-start",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, elementId);

  if (!elementType) return null;

  const side = placement.startsWith("bottom") ? "bottom" : "top";
  const extraCount = (selectionCount ?? 0) - 1;

  return (
    <div
      ref={refs.setFloating}
      className="selection-label-root"
      data-role="selection-label"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      <span
        data-side={side}
        className={`element-label${onSelectParent ? " element-label--interactive" : ""}${children ? " element-label--has-trailing" : ""}`}
        onClick={onSelectParent}
      >
        {onSelectParent && <span className="element-label__arrow">↑</span>}
        {elementType}
        {extraCount > 0 && (
          <span className="element-label__count"> +{extraCount}</span>
        )}
        {slotAddress && (
          <span
            className="element-label__slot"
            data-role="selection-slot-address"
          >
            in {slotAddress}
          </span>
        )}
        {(commitTick ?? 0) > 0 && <CommitFlash key={commitTick} />}
      </span>
      {children && (
        <span className="label-trailing" data-side={side}>
          {children}
        </span>
      )}
    </div>
  );
}
