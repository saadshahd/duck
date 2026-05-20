import type { Data } from "@puckeditor/core";
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
