import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";

type UseInlineEditProps = {
  registry: FiberRegistry | null;
  elementId: string;
  original: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

const selectAll = (el: HTMLElement): void => {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

/**
 * Makes the target element contentEditable in place.
 * Enter / blur → commit, Escape → cancel (restores original text).
 */
export function useInlineEdit({
  registry,
  elementId,
  original,
  onCommit,
  onCancel,
}: UseInlineEditProps): void {
  useEffect(
    function attachContentEditable() {
      const el = registry?.get(elementId);
      if (!el) return;

      el.contentEditable = "true";
      el.focus();
      selectAll(el);

      const keyActions: Record<string, () => void> = {
        Enter: () => onCommit(el.textContent ?? ""),
        Escape: () => {
          el.textContent = original;
          onCancel();
        },
      };

      const onKeyDown = (e: KeyboardEvent) => {
        const action = keyActions[e.key];
        if (!action) return;
        e.preventDefault();
        action();
      };

      const onBlur = () => onCommit(el.textContent ?? "");

      el.addEventListener("keydown", onKeyDown);
      el.addEventListener("blur", onBlur);

      return () => {
        el.contentEditable = "false";
        el.removeEventListener("keydown", onKeyDown);
        el.removeEventListener("blur", onBlur);
      };
    },
    [registry, elementId, original, onCommit, onCancel],
  );
}
