import { createContext, useContext } from "react";
import type { Config, Data } from "@puckeditor/core";
import type { EditorCommit } from "../types.js";

export type CrossSlotDrag =
  | {
      srcId: string;
      srcSlotKey: string;
      srcIndex: number;
    }
  | undefined;

export type SlotCtxValue = {
  data: Data;
  config: Config;
  commit: EditorCommit;
  parentId: string;
  // shared across all SlotOutline instances for the same parent
  crossDrag: CrossSlotDrag;
  setCrossDrag: (drag: CrossSlotDrag) => void;
};

export const SlotCtx = createContext<SlotCtxValue | null>(null);
export const useSlotCtx = (): SlotCtxValue => {
  const ctx = useContext(SlotCtx);
  if (!ctx) throw new Error("SlotCtx missing");
  return ctx;
};
