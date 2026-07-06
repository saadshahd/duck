import { useEffect } from "react";

/** Smooth scrollIntoView has no completion promise; `scrollend` covers browsers
 *  that emit it, the timeout covers no-op scrolls and browsers that don't. */
const SETTLE_FALLBACK_MS = 450;

const LOCK_PROPS = ["overflow", "scrollbar-gutter"] as const;

/** Lock scrolling on `el` via overflow:hidden + scrollbar-gutter:stable —
 *  deliberately NOT padding-right, which would shift the cutout/tether
 *  position trackers. Returns a release fn that restores the prior inline
 *  values. */
export function lock(el: HTMLElement): () => void {
  const prior = new Map(
    LOCK_PROPS.map((p) => [p, el.style.getPropertyValue(p)]),
  );
  el.style.setProperty("overflow", "hidden");
  el.style.setProperty("scrollbar-gutter", "stable");
  return () => {
    LOCK_PROPS.forEach((p) => {
      const value = prior.get(p);
      if (value) el.style.setProperty(p, value);
      else el.style.removeProperty(p);
    });
  };
}

/** Invoke `onSettled` exactly once — on the first `scrollend` from `target`,
 *  or after `fallbackMs` if none arrives. Returns a cancel fn. */
export function afterScrollSettles({
  target,
  fallbackMs,
  onSettled,
}: {
  target: EventTarget;
  fallbackMs: number;
  onSettled: () => void;
}): () => void {
  let isDone = false;
  const settle = () => {
    if (isDone) return;
    isDone = true;
    target.removeEventListener("scrollend", settle);
    clearTimeout(timer);
    onSettled();
  };
  const timer = setTimeout(settle, fallbackMs);
  target.addEventListener("scrollend", settle);
  return () => {
    isDone = true;
    target.removeEventListener("scrollend", settle);
    clearTimeout(timer);
  };
}

/** Lock window scroll while `active`, engaging only after the opening smooth
 *  scroll settles; release on deactivate/unmount. Seam: swap the lock()
 *  internals for react-remove-scroll if iOS/trackpad ever needs it. */
export function useScrollLock({ active }: { active: boolean }): void {
  useEffect(() => {
    if (!active) return;
    let release: (() => void) | undefined;
    const cancel = afterScrollSettles({
      target: window,
      fallbackMs: SETTLE_FALLBACK_MS,
      onSettled: () => {
        release = lock(document.documentElement);
      },
    });
    return () => {
      cancel();
      release?.();
    };
  }, [active]);
}
