import type { Data } from "@puckeditor/core";

export type ResolveTrigger = "insert" | "replace" | "load" | "force" | "move";

export type DataPushResult =
  | { status: "pushed"; entryId: string }
  | { status: "coalesced"; entryId: string }
  | { status: "collapsed"; entryId: string }
  | { status: "unchanged" };

export type ResolveDataPushResult = Extract<
  DataPushResult,
  { status: "pushed" | "coalesced" }
>;

export const emitsResolveOps = (
  result: DataPushResult,
): result is ResolveDataPushResult =>
  result.status === "pushed" || result.status === "coalesced";

/** Push a new data snapshot into the history stack. */
export type DataPush = (
  data: Data,
  label: string,
  group?: string,
) => DataPushResult;

export type ResolveOp =
  | { type: "insert"; id: string; trigger: "insert" }
  | { type: "update"; id: string; trigger: "replace" }
  | { type: "move"; id: string; trigger: "move" }
  | { type: "morph"; id: string; trigger: "replace" }
  | {
      type: "force";
      ids: readonly string[];
      trigger: Extract<ResolveTrigger, "force">;
    }
  | { type: "remove"; ids: readonly string[] };

export type ResolveOpEmit = (
  op: ResolveOp,
  entryId: string,
  data: Data,
) => void;

export type ClipboardActions = {
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
};
