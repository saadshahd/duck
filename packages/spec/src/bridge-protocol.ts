import type { Data } from "@puckeditor/core";
import type { Target } from "./target.js";

export type SelectionData = {
  readonly target: Target;
  readonly ancestorIds: string[];
};

/** Browser → bridge server */
export type BrowserMessage =
  | { type: "ready"; page: string }
  | ({ type: "selection-changed" } & SelectionData)
  | { type: "capture-response"; id: string; image: string };

export type CaptureMode =
  | { mode: "viewport" }
  | { mode: "element"; elementId: string }
  | { mode: "fullPage" };

/** Bridge server → browser */
export type ServerMessage =
  | { type: "spec-update"; data: Data }
  | ({ type: "capture-request"; id: string } & CaptureMode);

export type CaptureResult = {
  readonly image: string;
};
