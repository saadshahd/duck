import { useRef, useState } from "react";

/** Delayed hover state — becomes active after `ms` of continuous hover. */
export function useHoverDelay(ms: number) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return {
    active,
    enter() {
      timer.current = setTimeout(() => setActive(true), ms);
    },
    leave() {
      clearTimeout(timer.current);
      setActive(false);
    },
  } as const;
}
