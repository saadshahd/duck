import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import type { InlineEditing } from "../machine/index.js";

type UseInlineEditProps = {
  registry: FiberRegistry | null;
  editing: InlineEditing | null;
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

const prepare = (el: HTMLElement, editing: InlineEditing): void => {
  if (editing.trigger === "replace") {
    el.textContent = editing.char;
    const sel = window.getSelection();
    sel?.selectAllChildren(el);
    sel?.collapseToEnd();
  } else {
    selectAll(el);
  }
};

export function useInlineEdit({
  registry,
  editing,
  onCommit,
  onCancel,
}: UseInlineEditProps): void {
  useEffect(
    function attachContentEditable() {
      if (!editing) return;
      const el = registry?.get(editing.elementId);
      if (!el) return;

      el.contentEditable = "true";
      el.focus();
      prepare(el, editing);

      const keyActions: Record<string, () => void> = {
        Enter: () => onCommit(el.textContent ?? ""),
        Escape: () => {
          el.textContent = editing.original;
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
    [registry, editing, onCommit, onCancel],
  );
}
