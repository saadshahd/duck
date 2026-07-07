import { useCallback, useEffect, useState } from "react";
import { useShadowSheet } from "../overlay/index.js";
import type { BridgeStatus } from "./use-bridge.js";
import css from "./reconnect-prompt.css?inline";

type ReconnectPromptProps = {
  status: BridgeStatus;
  currentUrl: string;
  onReconnect: (url: string) => void;
  /** Called when the prompt should close: Escape, or the connection recovers
   *  on its own. The caller owns whether this component is mounted at all —
   *  it never self-hides on open, only ever asks to be dismissed. */
  onDismiss: () => void;
};

function portFrom(url: string): string {
  const match = url.match(/:(\d+)/);
  return match?.[1] ?? "";
}

function isValidPort(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

/** Deliberate escalation from the connection dot — never shown on its own.
 *  The caller mounts this only after a user action (clicking/activating the
 *  disconnected dot), and unmounts it on `onDismiss`. */
export function ReconnectPrompt({
  status,
  currentUrl,
  onReconnect,
  onDismiss,
}: ReconnectPromptProps) {
  useShadowSheet(css);
  const [port, setPort] = useState(() => portFrom(currentUrl));

  const inputRef = useCallback(
    (el: HTMLInputElement | null) => el?.focus(),
    [],
  );

  // The connection recovered on its own (or the user's reconnect attempt
  // succeeded) — the prompt has nothing left to do, so it closes itself.
  useEffect(() => {
    if (status !== "disconnected") onDismiss();
  }, [status, onDismiss]);

  if (status !== "disconnected") return null;

  function submit() {
    if (!isValidPort(port)) return;
    onReconnect(currentUrl.replace(/:\d+/, `:${port}`));
  }

  return (
    <div
      className="reconnect-prompt"
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") onDismiss();
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
