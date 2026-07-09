import type { FiberRegistry } from "../fiber/index.js";

/** Assign each element its id as `view-transition-name` for the duration of a
 *  reorder, returning a restore that puts the prior names back. */
export const tagTransitionNames = (reg: FiberRegistry, ids: string[]) => {
  const restores = ids.flatMap((id) => {
    const el = reg.get(id);
    if (!el) return [];
    const prev = el.style.viewTransitionName;
    el.style.viewTransitionName = id;
    return [
      () => {
        el.style.viewTransitionName = prev;
      },
    ];
  });
  return () => restores.forEach((fn) => fn());
};
