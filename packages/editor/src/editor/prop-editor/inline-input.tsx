import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import type { InlineEditing } from "../machine/index.js";
import { isPrintable } from "./keyboard-predicates.js";
import { findTextHost } from "./has-single-text-node.js";

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
      const registered = registry?.get(editing.elementId);
      if (!registered) return;

      // Edit on the element that owns the text node, not the component's
      // wrapper — the surface inherits the text's own style in place.
      const el = findTextHost(registered);

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
        if (action) {
          e.preventDefault();
          action();
          return;
        }

        /*
         * Take full control of printable key insertion to prevent native
         * element behavior (e.g. button activation on space). Space is not
         * printable globally (it is the carry-lift key) but must be inserted
         * here. Composition (IME) events pass through — isPrintable excludes
         * them.
         */
        if (isPrintable(e) || e.key === " ") {
          e.preventDefault();
          document.execCommand("insertText", false, e.key);
        }
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
