import { useCallback, useRef } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import {
  buildIndex,
  findById,
  findParent,
  getChildrenAt,
  slotKeysOf,
} from "@duck/spec";
import { add } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { DataPush } from "../types.js";

type InsertDeps = {
  data: Data;
  config: Config;
  lastSelectedId: string | null;
  send: (event: EditorEvent) => void;
  push: DataPush;
};

type InsertTarget = {
  parentId: string | null;
  slotKey: string | null;
  index?: number;
};

const randomSuffix = (): string => Math.random().toString(36).slice(2, 8);

const mintId = (componentType: string, taken: ReadonlySet<string>): string => {
  const prefix = componentType.toLowerCase();
  let id = `${prefix}-${randomSuffix()}`;
  while (taken.has(id)) id = `${prefix}-${randomSuffix()}`;
  return id;
};

/** Resolve where to place a new component relative to selection.
 *  - Selected component has slots → insert into first slot at end.
 *  - Otherwise → insert as next sibling of selected.
 *  - No selection → append at top level. */
const resolveInsertTarget = (
  data: Data,
  selectedId: string | null,
): InsertTarget | null => {
  if (!selectedId) {
    return { parentId: null, slotKey: null };
  }
  const selected = findById(data, selectedId);
  if (!selected) return null;

  const slots = slotKeysOf(selected);
  if (slots.length > 0) {
    const slotKey = slots[0];
    const children = getChildrenAt(data, selectedId, slotKey) ?? [];
    return { parentId: selectedId, slotKey, index: children.length };
  }

  const parent = findParent(data, selectedId);
  if (!parent) return null;
  return {
    parentId: parent.parentId,
    slotKey: parent.slotKey,
    index: parent.index + 1,
  };
};

export function useInsert(deps: InsertDeps): {
  onInsert: (componentType: string) => void;
} {
  const ref = useRef(deps);
  ref.current = deps;

  const onInsert = useCallback((componentType: string) => {
    const { data, config, lastSelectedId, send, push } = ref.current;

    const target = resolveInsertTarget(data, lastSelectedId);
    if (!target) return;

    const id = mintId(componentType, new Set(buildIndex(data).keys()));
    const component: ComponentData = {
      type: componentType,
      props: { id },
    };

    add(
      data,
      {
        parentId: target.parentId,
        slotKey: target.slotKey,
        component,
        index: target.index,
      },
      config,
    ).map((next) => {
      push(next, `Added ${componentType}`);
      send({ type: "SELECT", elementId: id });
    });
  }, []);

  return { onInsert };
}
