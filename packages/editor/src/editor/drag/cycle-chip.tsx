import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react";
import type { Data } from "@puckeditor/core";
import { useShadowSheet, useRegistryAnchor } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveContainerId, type DropTarget } from "../layout/index.js";
import css from "./drag.css?inline";

type Props = {
  registry: FiberRegistry;
  data: Data;
  target: DropTarget;
  status: { step: number; total: number };
};

export function CycleChip({ registry, data, target, status }: Props) {
  useShadowSheet(css);

  const containerId = resolveContainerId(data, target);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), shift({ padding: 8 })],
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, containerId);

  return (
    <div
      ref={refs.setFloating}
      data-role="cycle-chip"
      className="cycle-chip"
      style={{ ...floatingStyles, zIndex: 1 }}
      aria-live="polite"
      aria-atomic="true"
    >
      {status.step} of {status.total}
    </div>
  );
}
