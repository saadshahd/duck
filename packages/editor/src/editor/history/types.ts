import type { Spec } from "@json-render/core";

export type Snapshot = {
  spec: Spec;
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
      spec: Spec;
      label: string;
      group?: string;
      timestamp: number;
    }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RENAME"; index: number; name: string }
  | { type: "RESTORE"; index: number };
