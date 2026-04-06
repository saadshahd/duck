export type {
  BrowserMessage,
  ServerMessage,
  CaptureMode,
  SelectionData,
  CaptureResult,
} from "@json-render-editor/spec";

import type { Spec } from "@json-render/core";
import type { Storage } from "./storage.js";
import type {
  CaptureMode,
  CaptureResult,
  SelectionData,
} from "@json-render-editor/spec";

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
