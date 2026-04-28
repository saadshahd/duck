import type { Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import { getChildrenAt } from "@duck/spec";
import {
  type SpecOpsError,
  cloneAndMutate,
  descendantIds,
  findById,
  findParent,
  writableChildrenAt,
} from "./helpers.js";

/** Move the subtree at `id` to `(toParentId, toSlotKey, toIndex)`.
 *
 *  - `toParentId === null && toSlotKey === null` targets `data.content`.
 *  - Within-slot move where `toIndex` equals the current index is a no-op:
 *    the original `data` reference is returned (caller can detect with `===`).
 *  - Errors: `element-not-found`, `parent-not-found`, `slot-not-defined`,
 *    `index-out-of-bounds`, `circular-move`. */
export const move = (
  data: Data,
  id: string,
  toParentId: string | null,
  toSlotKey: string | null,
  toIndex: number,
): Result<Data, SpecOpsError> => {
  const source = findParent(data, id);
  if (!source) return err({ tag: "element-not-found", id });

  if (toParentId !== null) {
    const sourceComponent = findById(data, id);
    if (sourceComponent) {
      const descendants = descendantIds(sourceComponent);
      if (toParentId === id || descendants.has(toParentId))
        return err({ tag: "circular-move", id, toParentId });
    }
    if (!findById(data, toParentId))
      return err({ tag: "parent-not-found", parentId: toParentId });
  }

  const target = getChildrenAt(data, toParentId, toSlotKey);
  if (target === null)
    return err({
      tag: "slot-not-defined",
      parentId: toParentId ?? "",
      slotKey: toSlotKey ?? "",
    });

  const sameSlot =
    source.parentId === toParentId && source.slotKey === toSlotKey;

  // No-op: same slot, same index. Return original reference.
  if (sameSlot && source.index === toIndex) return ok(data);

  // Inclusive bound on the destination length, but when same-slot the source
  // first leaves the slot, shrinking length by 1 — clamp accordingly.
  const destLen = sameSlot ? target.length - 1 : target.length;
  if (toIndex < 0 || toIndex > destLen)
    return err({
      tag: "index-out-of-bounds",
      index: toIndex,
      length: destLen,
    });

  return ok(
    cloneAndMutate(data, (draft) => {
      const fromArr = writableChildrenAt(
        draft,
        source.parentId,
        source.slotKey,
      );
      if (!fromArr) return;
      const [moved] = fromArr.splice(source.index, 1);
      const toArr = writableChildrenAt(draft, toParentId, toSlotKey);
      if (!toArr) return;
      toArr.splice(toIndex, 0, moved);
    }),
  );
};
