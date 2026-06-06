import { useEffect, useRef, type RefObject } from "react";

/** Focus the element on mount. For contextual overlays that should land
 *  assistive-tech focus the moment they appear. Pass an existing ref to
 *  focus an element already tracked by another hook; omit it to get a
 *  fresh ref back. */
export function useAutoFocus<T extends HTMLElement>(
  external?: RefObject<T | null>,
): RefObject<T | null> {
  const own = useRef<T>(null);
  const ref = external ?? own;
  useEffect(() => {
    ref.current?.focus();
  }, [ref]);
  return ref;
}
