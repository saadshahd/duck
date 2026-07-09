import { createContext, useContext } from "react";
import type { Config, Data } from "@puckeditor/core";
import type { SlotPath } from "@duckeditor/spec";
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
  /** Close the sheet and select this array-item slot's child on the canvas
   *  (rings the child, scrolls it into view). An array-item slot is navigated
   *  from the sheet, never edited in it — clicking a child moves selection. */
  selectChild: (childId: string) => void;
  /** Close the sheet and open the catalog picker for this (empty) array-item
   *  slot, so a first child can be inserted into it on the canvas. */
  openInsert: (path: SlotPath) => void;
};

export const SlotCtx = createContext<SlotCtxValue | null>(null);
export const useSlotCtx = (): SlotCtxValue => {
  const ctx = useContext(SlotCtx);
  if (!ctx) throw new Error("SlotCtx missing");
  return ctx;
};
