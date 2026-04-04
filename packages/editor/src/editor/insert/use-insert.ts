import { useCallback, useRef } from "react";
import type { Spec } from "@json-render/core";
import type { EditorEvent } from "../machine/index.js";
import type { ComponentCatalog, SpecPush } from "../types.js";
import { defaultsFromSchema } from "../schema/index.js";
import { insertElement, type InsertPosition } from "../spec-ops/index.js";

type InsertDeps = {
  spec: Spec;
  selectedId: string | null;
  catalog: ComponentCatalog;
  send: (event: EditorEvent) => void;
  push: SpecPush;
};

const positionFor = (spec: Spec, targetId: string): InsertPosition =>
  spec.elements[targetId]?.children ? { tag: "child" } : { tag: "after" };

export function useInsert(deps: InsertDeps): {
  onInsert: (componentType: string) => void;
} {
  const ref = useRef(deps);
  ref.current = deps;

  const onInsert = useCallback((componentType: string) => {
    const { spec, selectedId, catalog, send, push } = ref.current;
    if (!selectedId) return;

    const entry = catalog[componentType];
    const props = entry ? defaultsFromSchema(entry.props, componentType) : {};
    const children = entry?.slots?.length ? [] : undefined;

    insertElement(
      spec,
      selectedId,
      positionFor(spec, selectedId),
      componentType,
      { props, children },
    ).map(({ spec: newSpec, elementId }) => {
      push(newSpec, `Added ${componentType}`);
      send({ type: "SELECT", elementId });
    });
  }, []);

  return { onInsert };
}
