import { useEffect } from "react";

/** Re-resolve overlay affordances against page geometry on every scroll, in the
 *  same animation frame as the scroll event. While `active`, any scroll (the
 *  window or any scroll container, via capture-phase) schedules one call to the
 *  latest `resolve` — so carry's tiles, labels, and lift pulse all re-aim at the
 *  content now under the unchanged viewport pointer, with no stale-coordinate
 *  window between the scroll and the next pointer move.
 *
 *  `resolve` is read through a ref so the subscription stays attached across
 *  re-renders without re-running on every closure identity change. */
export function useScrollResolve(args: {
  active: boolean;
  resolve: React.RefObject<(() => void) | null>;
}): void {
  const { active, resolve } = args;

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => resolve.current?.());
    };

    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [active, resolve]);
}
