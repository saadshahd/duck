import type { FiberRegistry } from "../fiber/index.js";
import { BoxModelOverlay } from "./box-model-overlay.js";
import { GapOverlay } from "./gap-overlay.js";
import { useBoxModel } from "./use-box-model.js";

export function BoxModelLayer({
  registry,
  elementId,
}: {
  registry: FiberRegistry;
  elementId: string;
}) {
  const data = useBoxModel(registry, elementId);
  if (!data) return null;
  return (
    <>
      <BoxModelOverlay data={data} />
      {data.gap && (
        <GapOverlay registry={registry} elementId={elementId} gap={data.gap} />
      )}
    </>
  );
}
