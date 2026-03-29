import type { Spec } from "@json-render/core";
import type { Storage } from "./storage.js";

// ── Bridge messages ────────────────────────────────────────────────

/** Browser → Server (page derived from ws.data, not in message) */
export type BrowserMessage =
  | { type: "ready"; page: string }
  | { type: "selection-changed"; elementId: string; ancestorIds: string[] }
  | { type: "capture-response"; id: string; image: string };

export type CaptureMode =
  | { mode: "viewport" }
  | { mode: "element"; elementId: string }
  | { mode: "fullPage" };

/** Server → Browser */
export type ServerMessage =
  | { type: "spec-update"; spec: Spec }
  | ({ type: "capture-request"; id: string } & CaptureMode);

// ── Selection snapshot ─────────────────────────────────────────────

export type SelectionData = {
  readonly elementId: string;
  readonly ancestorIds: string[];
};

// ── Capture result ─────────────────────────────────────────────────

export type CaptureResult = {
  readonly image: string;
};

// ── Catalog data (loaded from disk at startup) ─────────────────────

export type CatalogData = {
  readonly json: unknown;
  readonly prompt: string;
};

// ── Bridge handle ──────────────────────────────────────────────────

export type BridgeHandle = {
  start(): Promise<{ port: number }>;
  stop(): void;
  readonly port: number;
  broadcast(page: string, spec: Spec): void;
  lastSelection(page: string): SelectionData | null;
  capture(page: string, mode: CaptureMode): Promise<CaptureResult>;
  viewers(): Record<string, number>;
  hasViewers(page: string): boolean;
};

// ── MCP context (runtime deps for tool handlers) ───────────────────

export type McpContext = {
  readonly storage: Storage;
  readonly catalog: CatalogData;
  readonly bridge: BridgeHandle;
};
