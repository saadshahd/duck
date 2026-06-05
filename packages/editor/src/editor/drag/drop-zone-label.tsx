import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import type { Data } from "@puckeditor/core";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import {
  resolveContainerId,
  resolveLabel,
  type DropTarget,
} from "../layout/index.js";
import css from "./drag.css?inline";

type DropZoneLabelProps = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget;
};

export function DropZoneLabel({ registry, data, target }: DropZoneLabelProps) {
  useShadowSheet(css);

  const containerId = resolveContainerId(data, target);
  const label = resolveLabel(data, target);

  const { refs, floatingStyles } = useFloating({
    placement: "top-start",
    middleware: [offset(4), shift({ padding: 8 })],
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, containerId);

  if (!label) return null;

  return (
    <div
      ref={refs.setFloating}
      className="drop-zone-label"
      style={{ ...floatingStyles, zIndex: 1 }}
    >
      {label}
    </div>
  );
}
