import { useEffect } from "react";
import type { Config, Data } from "@puckeditor/core";
import { findById } from "@json-render-editor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveHit, isFromShadowDom } from "../fiber/index.js";
import type { EditorEvent } from "../machine/index.js";
import { findEditableProp, type ResolvedFields } from "./find-editable-prop.js";

type UseDoubleClickEditProps = {
  registry: FiberRegistry | null;
  data: Data;
  config: Config;
  send: (event: EditorEvent) => void;
};

/**
 * Wire double-click on text to START_INLINE_EDIT.
 * Resolves the clicked element → first editable text/textarea prop via findEditableProp.
 */
export function useDoubleClickEdit({
  registry,
  data,
  config,
  send,
}: UseDoubleClickEditProps): void {
  useEffect(
    function wireDblClick() {
      if (!registry) return;

      const onDblClick = (e: MouseEvent) => {
        if (isFromShadowDom(e)) return;
        const hit = resolveHit(registry, e.clientX, e.clientY);
        if (!hit) return;

        const component = findById(data, hit.elementId);
        if (!component) return;

        const fields = config.components[component.type]?.fields;
        if (!fields) return;

        const match = findEditableProp(component, fields as ResolvedFields);
        if (!match) return;

        e.preventDefault();
        send({
          type: "START_INLINE_EDIT",
          elementId: hit.elementId,
          propKey: match.propKey,
          original: match.value,
          trigger: "select",
        });
      };

      document.addEventListener("dblclick", onDblClick);
      return () => document.removeEventListener("dblclick", onDblClick);
    },
    [registry, data, config, send],
  );
}
