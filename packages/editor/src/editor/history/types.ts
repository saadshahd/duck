import type { ComponentData, Data } from "@puckeditor/core";

export type Snapshot = {
  id: string;
  data: Data;
  label: string;
  timestamp: number;
  name?: string;
  group?: string;
};

export type HistoryContext = {
  entries: Snapshot[];
  currentIndex: number;
  suppressNextOnChange: boolean;
};

export type HistoryEvent =
  | {
      type: "PUSH";
      data: Data;
      label: string;
      group?: string;
      timestamp: number;
    }
  | {
      type: "APPLY_RESOLUTION";
      entryId: string;
      nodeId: string;
      inputAtResolveTime: ComponentData;
      resolvedNode: ComponentData;
    }
  | { type: "RESET"; data: Data; timestamp: number }
  | { type: "ACK_SUPPRESSED_CHANGE" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RENAME"; index: number; name: string }
  | { type: "RESTORE"; index: number };

export type HistoryEventOf<EventType extends HistoryEvent["type"]> = Extract<
  HistoryEvent,
  { type: EventType }
>;

export type HistoryEventPayload<EventType extends HistoryEvent["type"]> = Omit<
  HistoryEventOf<EventType>,
  "type"
>;
