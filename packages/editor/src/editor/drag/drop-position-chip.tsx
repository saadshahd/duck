import {
  useFloating,
  offset,
  shift,
  autoUpdate,
  type Placement,
} from "@floating-ui/react";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { DropTarget } from "../layout/index.js";
import css from "./drag.css?inline";

const EDGE_PLACEMENT: Record<Edge, Placement> = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

const positionText = (edge: Edge, siblingType: string): string =>
  `${edge === "top" || edge === "left" ? "before" : "after"} ${siblingType}`;

type Props = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget & { kind: "line" };
};

export function DropPositionChip({ registry, data, target }: Props) {
  useShadowSheet(css);

  const siblingType = findById(data, target.elementId)?.type;

  const { refs, floatingStyles } = useFloating({
    placement: EDGE_PLACEMENT[target.edge],
    middleware: [offset(4), shift({ padding: 8 })],
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, target.elementId);

  if (!siblingType) return null;

  return (
    <div
      ref={refs.setFloating}
      data-role="drop-position-chip"
      className="drop-position-chip"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      {positionText(target.edge, siblingType)}
    </div>
  );
}
