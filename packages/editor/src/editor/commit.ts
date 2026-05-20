import { useCallback } from "react";
import type { Data } from "@puckeditor/core";
import { findParent } from "@duckeditor/spec";
import {
  emitsResolveOps,
  type DataCommit,
  type DataPush,
  type EditorCommit,
  type ResolveOp,
  type ResolveOpEmit,
  type ResolvePlan,
} from "./types.js";

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

export const resolvePlanToOp = ({
  plan,
  beforeData,
  afterData,
}: {
  plan: ResolvePlan;
  beforeData: Data;
  afterData: Data;
}): ResolveOp | null => {
  switch (plan.kind) {
    case "none":
      return null;
    case "insert":
      return { type: "insert", id: plan.id, trigger: "insert" };
    case "update":
      return { type: "update", id: plan.id, trigger: "replace" };
    case "move":
      return parentScopeChanged({ beforeData, afterData, id: plan.id })
        ? { type: "move", id: plan.id, trigger: "move" }
        : null;
    case "morph":
      return { type: "morph", id: plan.id, trigger: "replace" };
    case "remove":
      return { type: "remove", ids: plan.ids };
    case "force":
      return { type: "force", ids: plan.ids, trigger: "force" };
  }

  const unhandled: never = plan;
  return null;
};

export const commitData = ({
  commit,
  push,
  emitOp,
}: {
  commit: DataCommit;
  push: DataPush;
  emitOp: ResolveOpEmit;
}) => {
  const { beforeData, afterData, label, group, resolve } = commit;
  const result = push(afterData, label, group);
  if (!emitsResolveOps(result)) return result;

  const op = resolvePlanToOp({ plan: resolve, beforeData, afterData });
  if (op) emitOp(op, result.entryId, afterData);
  return result;
};

export const useEditorCommit = ({
  push,
  emitOp,
}: {
  push: DataPush;
  emitOp: ResolveOpEmit;
}): EditorCommit =>
  useCallback(
    (commit) => commitData({ commit, push, emitOp }),
    [push, emitOp],
  );
