import type { Data } from "@puckeditor/core";
import { err, ok, type Result } from "neverthrow";
import {
  getChildrenAt,
  sameSite,
  slotKeyOf,
  writableChildrenAt,
  type ParentSite,
} from "@duckeditor/spec";
import {
  type SpecOpsError,
  cloneAndMutate,
  descendantIds,
  findById,
  findParent,
} from "./helpers.js";

/** Move the subtree at `id` to `dest` at `toIndex`.
 *
 *  - Within-slot move where `toIndex` equals the current index is a no-op:
 *    the original `data` reference is returned (caller can detect with `===`).
 *  - Errors: `element-not-found`, `parent-not-found`, `slot-not-defined`,
 *    `index-out-of-bounds`, `circular-move`. */
export const move = (
  data: Data,
  id: string,
  dest: ParentSite,
  toIndex: number,
): Result<Data, SpecOpsError> => {
  const source = findParent(data, id);
  if (!source) return err({ tag: "element-not-found", id });

  if (dest.at === "slot") {
    const sourceComponent = findById(data, id);
    if (sourceComponent) {
      const descendants = descendantIds(sourceComponent);
      if (dest.parentId === id || descendants.has(dest.parentId))
        return err({ tag: "circular-move", id, toParentId: dest.parentId });
    }
    if (!findById(data, dest.parentId))
      return err({ tag: "parent-not-found", parentId: dest.parentId });
  }

  const target = getChildrenAt(data, dest);
  if (target === null)
    return err({
      tag: "slot-not-defined",
      parentId: dest.at === "slot" ? dest.parentId : "",
      slotKey: dest.at === "slot" ? slotKeyOf(dest.path) : "",
    });

  const sameSlot = sameSite(source, dest);

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
      const fromArr = writableChildrenAt(draft, source);
      if (!fromArr) return;
      const [moved] = fromArr.splice(source.index, 1);
      const toArr = writableChildrenAt(draft, dest);
      if (!toArr) return;
      toArr.splice(toIndex, 0, moved);
    }),
  );
};
