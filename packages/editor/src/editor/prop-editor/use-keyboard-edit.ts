import { useEffect } from "react";
import type { Config, Data } from "@puckeditor/core";
import { findById } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { EditorEvent } from "../machine/index.js";
import { isEditable } from "../overlay/index.js";
import { findEditableProp, type ResolvedFields } from "./find-editable-prop.js";
import { hasSingleTextNode } from "./has-single-text-node.js";
import { isPrintable } from "./keyboard-predicates.js";

type UseKeyboardEditProps = {
  registry: FiberRegistry | null;
  data: Data;
  config: Config;
  selectedElementId: string | null;
  pointer: string;
  send: (event: EditorEvent) => void;
};

export function useKeyboardEdit({
  registry,
  data,
  config,
  selectedElementId,
  pointer,
  send,
}: UseKeyboardEditProps): void {
  useEffect(
    function wireKeyboardEdit() {
      const onKeyDown = (e: KeyboardEvent) => {
        if (pointer !== "selected" || !selectedElementId) return;
        if (!isPrintable(e)) return;
        if (isEditable(e.target)) return;

        const component = findById(data, selectedElementId);
        if (!component) return;

        const fields = config.components[component.type]?.fields;
        if (!fields) return;

        const match = findEditableProp(component, fields as ResolvedFields);
        if (!match) return;

        const el = registry?.get(selectedElementId);
        if (!el || !hasSingleTextNode(el)) return;

        e.preventDefault();
        send({
          type: "START_INLINE_EDIT",
          elementId: selectedElementId,
          propKey: match.propKey,
          original: match.value,
          trigger: "replace",
          char: e.key,
        });
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    },
    [registry, data, config, selectedElementId, pointer, send],
  );
}
