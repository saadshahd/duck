import { Cycle, type CycleState } from "../layout/index.js";
import type { Destination } from "../layout/index.js";

/** Resolve the next cycle state for one discrete step (arrow key or Tab),
 *  given whether the pointer has moved since this carry began.
 *
 *  A fresh, never-stepped cycle already previews `stack[from]` — the
 *  pointer-aimed (or, absent any pointer move, the lift-seeded) destination —
 *  before any key is pressed. `Cycle.step`/`stepBack` treat that first press
 *  as "lock onto the aim," which is invisible when nothing has moved since:
 *  the preview doesn't change, so the press reads as a no-op. Once a real
 *  pointer aim exists (the user moved the mouse), that lock frame is the
 *  correct, intentional first step — advancing further collapses two
 *  keystrokes' worth of intent into one.
 *
 *  So: skip the lock frame — advance immediately — only when BOTH the cycle
 *  has never been stepped AND the pointer hasn't moved since. Any other case
 *  (already active, or a real pointer aim exists) takes the normal single
 *  step. */
export const resolveCycleStep = (
  direction: "forward" | "back",
  pointerMoved: boolean,
  cycle: CycleState,
  stack: readonly Destination[],
  from: number,
): CycleState => {
  const advance = direction === "forward" ? Cycle.step : Cycle.stepBack;
  const stepped = advance(cycle, stack, from);
  const skipInvisibleLock = !pointerMoved && !cycle.active;
  return skipInvisibleLock ? advance(stepped, stack, from) : stepped;
};
