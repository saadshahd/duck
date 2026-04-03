import { useEffect } from "react";
import type { Spec } from "@json-render/core";
import type { ZodTypeAny } from "zod";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveHit, isFromShadowDom } from "../fiber/index.js";
import type { EditorEvent } from "../machine/index.js";
import { findEditableProp } from "./find-editable-prop.js";

type UseDoubleClickEditProps = {
  registry: FiberRegistry | null;
  spec: Spec;
  getPropSchema: ((type: string) => ZodTypeAny | undefined) | undefined;
  send: (event: EditorEvent) => void;
};

/**
 * Wire double-click on text to START_INLINE_EDIT machine event.
 * Resolves the clicked text → element → string prop via findEditableProp.
 */
export function useDoubleClickEdit({
  registry,
  spec,
  getPropSchema,
  send,
}: UseDoubleClickEditProps): void {
  useEffect(
    function wireDblClick() {
      if (!registry || !getPropSchema) return;

      const onDblClick = (e: MouseEvent) => {
        if (isFromShadowDom(e)) return;
        const hit = resolveHit(registry, e.clientX, e.clientY);
        if (!hit) return;

        const element = spec.elements[hit.elementId];
        if (!element) return;

        const schema = getPropSchema(element.type);
        if (!schema) return;

        const target = e.target as HTMLElement;
        const match = findEditableProp(
          element,
          schema,
          target.textContent ?? "",
        );
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
    [registry, spec, getPropSchema, send],
  );
}
