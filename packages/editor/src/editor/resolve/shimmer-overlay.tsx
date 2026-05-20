import type { FiberRegistry } from "../fiber/index.js";
import { useHighlightRef, useShadowSheet } from "../overlay/index.js";
import css from "./shimmer-overlay.css?inline";

type OverlayState = "resolving" | "error";

function ResolveFrame({
  registry,
  id,
  state,
}: {
  registry: FiberRegistry;
  id: string;
  state: OverlayState;
}) {
  const ref = useHighlightRef(registry, id);
  return (
    <div
      ref={ref}
      className={`resolve-frame resolve-frame--${state}`}
      data-role={`resolve-${state}`}
      data-element-id={id}
    />
  );
}

export function ShimmerOverlay({
  registry,
  resolvingIds,
  errorIds,
}: {
  registry: FiberRegistry | null;
  resolvingIds: ReadonlySet<string>;
  errorIds: ReadonlySet<string>;
}) {
  useShadowSheet(css);
  if (!registry) return null;

  return (
    <>
      {[...resolvingIds].map((id) => (
        <ResolveFrame
          key={`resolving:${id}`}
          registry={registry}
          id={id}
          state="resolving"
        />
      ))}
      {[...errorIds].map((id) => (
        <ResolveFrame key={`error:${id}`} registry={registry} id={id} state="error" />
      ))}
    </>
  );
}
