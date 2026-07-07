import { useShadowSheet } from "../overlay/index.js";
import { useHoverDelay } from "./use-hover-delay.js";
import type { BridgeStatus } from "./use-bridge.js";
import css from "./connection-dot.css?inline";

const LABELS: Record<BridgeStatus, string> = {
  connected: "Bridge connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
};

type ConnectionDotProps = {
  status: BridgeStatus;
  /** Opens the full reconnect prompt — the deliberate escalation from this
   *  passive status signal. Omit (or while connected) to make the dot inert:
   *  no click affordance, nothing to escalate to. */
  onOpenReconnect?: () => void;
};

export function ConnectionDot({ status, onOpenReconnect }: ConnectionDotProps) {
  useShadowSheet(css);
  const hover = useHoverDelay(300);

  const clickable = status === "disconnected" && !!onOpenReconnect;

  const activate = () => {
    if (clickable) onOpenReconnect();
  };

  return (
    <>
      <div
        className="connection-dot"
        data-role="bridge-connection-dot"
        data-status={status}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? "Reconnect to the bridge" : undefined}
        onMouseEnter={hover.enter}
        onMouseLeave={hover.leave}
        onClick={clickable ? activate : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                activate();
              }
            : undefined
        }
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
