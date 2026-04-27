import type { Config, Data } from "@puckeditor/core";
import type { Storage } from "./storage.js";
import type { Bridge } from "./bridge/index.js";

export type McpContext = {
  readonly storage: Storage;
  readonly config: Config;
  readonly bridge: Bridge;
};

export type {
  BrowserMessage,
  CaptureMode,
  SelectionData,
  CaptureResult,
} from "@json-render-editor/spec";

import type { CaptureMode } from "@json-render-editor/spec";

/** Bridge server → browser. Mirrors the @json-render-editor/spec contract:
 *  spec-update carries Puck Data under `data`. Defined locally until the
 *  spec package's bridge-protocol.ts is migrated. */
export type ServerMessage =
  | { type: "spec-update"; data: Data }
  | ({ type: "capture-request"; id: string } & CaptureMode);
