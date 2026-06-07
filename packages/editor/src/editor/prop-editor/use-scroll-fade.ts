import { useEffect, useRef } from "react";

/** Toggle `data-visible` on a fade overlay based on whether a bottom sentinel is
 *  in view: sentinel visible → at end → fade off; sentinel hidden → more below →
 *  fade on. Purely cosmetic; the overlay is pointer-events:none. */
export function useScrollFade(): {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  fadeRef: React.RefObject<HTMLDivElement | null>;
} {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const viewport = viewportRef.current;
    const fade = fadeRef.current;
    if (!sentinel || !viewport || !fade) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fade.removeAttribute("data-visible");
        else fade.setAttribute("data-visible", "");
      },
      { root: viewport, threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return { viewportRef, sentinelRef, fadeRef };
}
