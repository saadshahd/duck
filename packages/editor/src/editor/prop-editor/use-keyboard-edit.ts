import { useEffect } from "react";
import type { Config, Data } from "@puckeditor/core";
import { findById } from "@json-render-editor/spec";
import type { EditorEvent } from "../machine/index.js";
import { isEditable } from "../overlay/index.js";
import { findEditableProp, type ResolvedFields } from "./find-editable-prop.js";
import { isPrintable } from "./keyboard-predicates.js";

type UseKeyboardEditProps = {
  data: Data;
  config: Config;
  lastSelectedId: string | null;
  pointer: string;
  send: (event: EditorEvent) => void;
};

export function useKeyboardEdit({
  data,
  config,
  lastSelectedId,
  pointer,
  send,
}: UseKeyboardEditProps): void {
  useEffect(
    function wireKeyboardEdit() {
      const onKeyDown = (e: KeyboardEvent) => {
        if (pointer !== "selected" || !lastSelectedId) return;
        if (!isPrintable(e)) return;
        if (isEditable(e.target)) return;

        const component = findById(data, lastSelectedId);
        if (!component) return;

        const fields = config.components[component.type]?.fields;
        if (!fields) return;

        const match = findEditableProp(component, fields as ResolvedFields);
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
    [data, config, lastSelectedId, pointer, send],
  );
}
