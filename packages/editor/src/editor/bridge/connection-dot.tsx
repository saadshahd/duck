import { useContext } from "react";
import { TooltipTrigger, Tooltip } from "react-aria-components";
import { useShadowSheet, PortalContext } from "../overlay/index.js";
import type { BridgeStatus } from "./use-bridge.js";
import css from "./connection-dot.css?inline";

const LABELS: Record<BridgeStatus, string> = {
  connected: "Bridge connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
};

export function ConnectionDot({ status }: { status: BridgeStatus }) {
  useShadowSheet(css);
  const portalContainer = useContext(PortalContext);

  return (
    <TooltipTrigger delay={300}>
      <button
        type="button"
        className="connection-dot"
        data-status={status}
        aria-label={LABELS[status]}
      />
      <Tooltip
        className="connection-dot-tooltip"
        placement="top"
        UNSTABLE_portalContainer={portalContainer ?? undefined}
      >
        {LABELS[status]}
      </Tooltip>
    </TooltipTrigger>
  );
}
