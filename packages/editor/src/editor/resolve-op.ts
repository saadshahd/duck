import type { Data } from "@puckeditor/core";
import { findParent } from "@duckeditor/spec";
import {
  emitsResolveOps,
  type DataPushResult,
  type ResolveOp,
  type ResolveOpEmit,
} from "./types.js";

export const emitResolveOp = ({
  result,
  emitOp,
  op,
  data,
}: {
  result: DataPushResult;
  emitOp: ResolveOpEmit;
  op: ResolveOp;
  data: Data;
}): void => {
  if (!emitsResolveOps(result)) return;
  emitOp(op, result.entryId, data);
};

const parentScopeChanged = ({
  beforeData,
  afterData,
  id,
}: {
  beforeData: Data;
  afterData: Data;
  id: string;
}): boolean => {
  const before = findParent(beforeData, id);
  const after = findParent(afterData, id);
  if (!before || !after) return false;
  return before.parentId !== after.parentId || before.slotKey !== after.slotKey;
};

export const emitMoveResolveOp = ({
  result,
  emitOp,
  id,
  beforeData,
  afterData,
}: {
  result: DataPushResult;
  emitOp: ResolveOpEmit;
  id: string;
  beforeData: Data;
  afterData: Data;
}): void => {
  if (!parentScopeChanged({ beforeData, afterData, id })) return;
  emitResolveOp({
    result,
    emitOp,
    op: { type: "move", id, trigger: "move" },
    data: afterData,
  });
};
