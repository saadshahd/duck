import type { Config } from "@puckeditor/core";
import type { Storage } from "./storage.js";
import type { Bridge } from "./bridge/index.js";
import type { CaptureStorage } from "./capture-storage.js";
import type { DraftRegistry } from "./draft-registry.js";

export type McpContext = {
  readonly storage: Storage;
  readonly config: Config;
  readonly bridge: Bridge;
  readonly captureStorage: CaptureStorage;
  readonly drafts: DraftRegistry;
};

export type {
  BrowserMessage,
  ServerMessage,
  CaptureMode,
  SelectionData,
  CaptureResult,
} from "@duckeditor/spec";
