import { flushSync } from "react-dom";
import type { Spec } from "@json-render/core";

export const animatedUpdate = (onChange: (s: Spec) => void, next: Spec) => {
  document.startViewTransition
    ? document.startViewTransition(() => flushSync(() => onChange(next)))
    : onChange(next);
};
