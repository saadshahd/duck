import { useEffect } from "react";
import type { Spec } from "@json-render/core";
import type { ZodTypeAny } from "zod";
import type { EditorEvent } from "../machine/index.js";
import { isEditable } from "../overlay/index.js";
import { findSingleEditableProp } from "./find-editable-prop.js";
import { isPrintable } from "./keyboard-predicates.js";

type UseKeyboardEditProps = {
  spec: Spec;
  lastSelectedId: string | null;
  pointer: string;
  getPropSchema: ((type: string) => ZodTypeAny | undefined) | undefined;
  send: (event: EditorEvent) => void;
};

export function useKeyboardEdit({
  spec,
  lastSelectedId,
  pointer,
  getPropSchema,
  send,
}: UseKeyboardEditProps): void {
  useEffect(
    function wireKeyboardEdit() {
      if (!getPropSchema) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (pointer !== "selected" || !lastSelectedId) return;
        if (!isPrintable(e)) return;
        if (isEditable(e.target)) return;

        const element = spec.elements[lastSelectedId];
        if (!element) return;

        const schema = getPropSchema(element.type);
        if (!schema) return;

        const match = findSingleEditableProp(element, schema);
        if (!match) return;

        e.preventDefault();
        send({
          type: "START_INLINE_EDIT",
          elementId: lastSelectedId,
          propKey: match.propKey,
          original: match.value,
          trigger: "replace",
          char: e.key,
        });
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    },
    [spec, lastSelectedId, pointer, getPropSchema, send],
  );
}
