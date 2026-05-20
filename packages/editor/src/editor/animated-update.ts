import { flushSync } from "react-dom";
import type { Data } from "@puckeditor/core";

export const animatedUpdate = (
  onChange: (d: Data) => void,
  next: Data,
): void => {
  const commit = () => {
    onChange(next);
  };

  document.startViewTransition
    ? document.startViewTransition(() => flushSync(commit))
    : commit();
};
