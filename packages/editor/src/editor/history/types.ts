import type { Data } from "@puckeditor/core";

export type Snapshot = {
  data: Data;
  label: string;
  timestamp: number;
  name?: string;
  group?: string;
};

export type HistoryContext = {
  entries: Snapshot[];
  currentIndex: number;
};

export type HistoryEvent =
  | {
      type: "PUSH";
      data: Data;
      label: string;
      group?: string;
      timestamp: number;
    }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RENAME"; index: number; name: string }
  | { type: "RESTORE"; index: number };
