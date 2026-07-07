import { useLayoutEffect, useRef } from "react";

/** Keeps focus on the moved row after a reorder. Rows register their element by
 *  stable key; `focusMoved(key)` marks one, and once the reorder has committed
 *  to the DOM the row is focused — so focus travels with the item instead of
 *  being stranded on a now-disabled end button or a different row's index. */
export function useReorderFocus() {
  const rows = useRef(new Map<string, HTMLElement>());
  const pending = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const key = pending.current;
    if (!key) return;
    pending.current = undefined;
    rows.current.get(key)?.focus();
  });

  const register = (key: string) => (el: HTMLElement | null) => {
    if (el) rows.current.set(key, el);
    else rows.current.delete(key);
  };

  const focusMoved = (key: string) => {
    pending.current = key;
  };

  return { register, focusMoved };
}
