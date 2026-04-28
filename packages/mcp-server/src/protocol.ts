import type { Config } from "@puckeditor/core";
import type { Storage } from "./storage.js";
import type { Bridge } from "./bridge/index.js";

export type McpContext = {
  readonly storage: Storage;
  readonly config: Config;
  readonly bridge: Bridge;
};

export type {
  BrowserMessage,
  ServerMessage,
  CaptureMode,
  SelectionData,
  CaptureResult,
} from "@json-render-editor/spec";
