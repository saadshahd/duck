import { useCallback, useRef } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import {
  buildIndex,
  findById,
  findParent,
  getChildrenAt,
  slotKeysOf,
} from "@duckeditor/spec";
import { add } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { EditorCommit } from "../types.js";

type InsertDeps = {
  data: Data;
  config: Config;
  selection: Target | null;
  send: (event: EditorEvent) => void;
  commit: EditorCommit;
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

/** Resolve where to place a new component relative to the current selection.
 *  - Slot target → append into that slot.
 *  - Element with slots → insert into first slot at end.
 *  - Element without slots → insert as next sibling.
 *  - No selection → append at top level. */
export const resolveInsertTarget = (
  data: Data,
  selection: Target | null,
): InsertTarget | null => {
  if (selection?.kind === "slot") {
    const children =
      getChildrenAt(data, selection.parentId, selection.slotKey) ?? [];
    return {
      parentId: selection.parentId,
      slotKey: selection.slotKey,
      index: children.length,
    };
  }
  const elementId = Target.elementId(selection);
  if (!elementId) {
    return { parentId: null, slotKey: null };
  }
  const selected = findById(data, elementId);
  if (!selected) return null;

  const slots = slotKeysOf(selected);
  if (slots.length > 0) {
    const slotKey = slots[0];
    const children = getChildrenAt(data, elementId, slotKey) ?? [];
    return { parentId: elementId, slotKey, index: children.length };
  }

  const parent = findParent(data, elementId);
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
    const { data, config, lastSelectedId, send, commit } = ref.current;

    const target = resolveInsertTarget(data, selection);
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
      commit({
        beforeData: data,
        afterData: next,
        label: `Added ${componentType}`,
        resolve: { kind: "insert", id },
      });
      send({ type: "SELECT", elementId: id });
    });
  }, []);

  return { onInsert };
}
