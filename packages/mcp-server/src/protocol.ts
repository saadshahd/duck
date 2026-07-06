import type { Config } from "@puckeditor/core";
import type { Storage } from "./storage.js";
import type { Bridge } from "./bridge/index.js";
import type { CaptureStorage } from "./capture-storage.js";

export type McpContext = {
  readonly storage: Storage;
  readonly config: Config;
  readonly bridge: Bridge;
  readonly captureStorage: CaptureStorage;
};

export type {
  BrowserMessage,
  ServerMessage,
  CaptureMode,
  SelectionData,
  CaptureResult,
} from "@duckeditor/spec";
