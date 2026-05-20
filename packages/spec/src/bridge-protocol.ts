import type { Data } from "@puckeditor/core";

/** Browser → bridge server */
export type BrowserMessage =
  | { type: "ready"; page: string }
  | { type: "selection-changed"; elementId: string; ancestorIds: string[] }
  | { type: "capture-response"; id: string; image: string };

export type CaptureMode =
  | { mode: "viewport" }
  | { mode: "element"; elementId: string }
  | { mode: "fullPage" };

/** Bridge server → browser */
export type ServerMessage =
  | { type: "spec-update"; data: Data }
  | ({ type: "capture-request"; id: string } & CaptureMode);

export type SelectionData = {
  readonly elementId: string;
  readonly ancestorIds: string[];
};

export type CaptureResult = {
  readonly image: string;
};
