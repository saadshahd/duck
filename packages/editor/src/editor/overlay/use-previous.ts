import { useRef } from "react";

/** Returns the value from the previous render. On the first render, returns the
 *  initial value (same as current). */
export function usePrevious<T>(value: T): T {
  const ref = useRef<T>(value);
  const prev = ref.current;
  ref.current = value;
  return prev;
}
