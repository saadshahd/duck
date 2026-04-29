import { useShadowSheet } from "../overlay/index.js";
import { useHoverDelay } from "./use-hover-delay.js";
import type { BridgeStatus } from "./use-bridge.js";
import css from "./connection-dot.css?inline";

const LABELS: Record<BridgeStatus, string> = {
  connected: "Bridge connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
};

export function ConnectionDot({ status }: { status: BridgeStatus }) {
  useShadowSheet(css);
  const hover = useHoverDelay(300);

  return (
    <>
      <div
        className="connection-dot"
        data-status={status}
        onMouseEnter={hover.enter}
        onMouseLeave={hover.leave}
      />
      <div
        className="connection-dot-tooltip"
        data-visible={hover.active || undefined}
      >
        {LABELS[status]}
      </div>
    </>
  );
}
