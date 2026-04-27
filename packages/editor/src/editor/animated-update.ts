import { flushSync } from "react-dom";
import type { Data } from "@puckeditor/core";

export const animatedUpdate = (onChange: (d: Data) => void, next: Data) => {
  document.startViewTransition
    ? document.startViewTransition(() => flushSync(() => onChange(next)))
    : onChange(next);
};
