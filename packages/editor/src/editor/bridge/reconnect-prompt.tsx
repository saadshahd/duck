import { useCallback, useState } from "react";
import { useShadowSheet } from "../overlay/index.js";
import type { BridgeStatus } from "./use-bridge.js";
import css from "./reconnect-prompt.css?inline";

type ReconnectPromptProps = {
  status: BridgeStatus;
  currentUrl: string;
  onReconnect: (url: string) => void;
};

function portFrom(url: string): string {
  const match = url.match(/:(\d+)/);
  return match?.[1] ?? "";
}

function isValidPort(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

export function ReconnectPrompt({
  status,
  currentUrl,
  onReconnect,
}: ReconnectPromptProps) {
  useShadowSheet(css);
  const [dismissed, setDismissed] = useState(false);
  const [port, setPort] = useState(() => portFrom(currentUrl));

  const inputRef = useCallback(
    (el: HTMLInputElement | null) => el?.focus(),
    [],
  );

  const visible = status === "disconnected" && !dismissed;

  if (status !== "disconnected" && dismissed) setDismissed(false);

  if (!visible) return null;

  function submit() {
    if (!isValidPort(port)) return;
    onReconnect(currentUrl.replace(/:\d+/, `:${port}`));
  }

  return (
    <div
      className="reconnect-prompt"
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") setDismissed(true);
      }}
    >
      <span className="reconnect-label">Port:</span>
      <input
        ref={inputRef}
        className="reconnect-input"
        type="text"
        inputMode="numeric"
        value={port}
        onChange={(e) => setPort(e.target.value)}
      />
      <button className="reconnect-button" onClick={submit}>
        Connect
      </button>
    </div>
  );
}
