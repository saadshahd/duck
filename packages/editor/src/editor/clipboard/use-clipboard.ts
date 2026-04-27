import { useCallback, useRef } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { findParent } from "@json-render-editor/spec";
import { copy, paste, remove, type ComponentMap } from "../spec-ops/index.js";
import type { DataPush } from "../types.js";

// --- Types ---

type ClipboardDeps = {
  data: Data;
  config: Config;
  lastSelectedId: string | null;
  push: DataPush;
  onSelect: (elementIds: string[]) => void;
  onDeselect: () => void;
};

export type ClipboardActions = {
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
};

// --- Clipboard I/O ---

const FRAGMENT_TAG = "puck-fragment";

type Fragment = { _tag: typeof FRAGMENT_TAG; component: ComponentData };

const writeFragment = (component: ComponentData): void => {
  const fragment: Fragment = { _tag: FRAGMENT_TAG, component };
  navigator.clipboard.writeText(JSON.stringify(fragment)).catch(() => {});
};

const readFragment = async (): Promise<ComponentData | null> => {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text) as Partial<Fragment>;
    if (parsed?._tag !== FRAGMENT_TAG || !parsed.component) return null;
    return parsed.component;
  } catch {
    return null;
  }
};

// --- Paste position ---

/** Where to paste relative to the current selection.
 *  Paste as next sibling of selected; appends to top-level if no selection. */
const pastePosition = (
  data: Data,
  selectedId: string | null,
): {
  parentId: string | null;
  slotKey: string | null;
  index: number;
} | null => {
  if (!selectedId) {
    return { parentId: null, slotKey: null, index: data.content.length };
  }
  const parent = findParent(data, selectedId);
  if (!parent) return null;
  return { ...parent, index: parent.index + 1 };
};

// --- Hook ---

export function useClipboard(deps: ClipboardDeps): ClipboardActions {
  const ref = useRef(deps);
  ref.current = deps;

  const onCopy = useCallback(() => {
    const { data, lastSelectedId } = ref.current;
    if (!lastSelectedId) return;
    copy(data, lastSelectedId).map(writeFragment);
  }, []);

  const onCut = useCallback(() => {
    const { data, lastSelectedId, push, onDeselect } = ref.current;
    if (!lastSelectedId) return;
    copy(data, lastSelectedId)
      .andThen((component) => {
        writeFragment(component);
        return remove(data, lastSelectedId);
      })
      .map((next) => {
        push(next, "Cut");
        onDeselect();
      });
  }, []);

  const onPaste = useCallback(async () => {
    const component = await readFragment();
    if (!component) return;

    const { data, config, lastSelectedId, push, onSelect } = ref.current;
    const position = pastePosition(data, lastSelectedId);
    if (!position) return;

    paste(
      data,
      position.parentId,
      position.slotKey,
      component,
      config.components as ComponentMap,
      position.index,
    ).map(({ data: next, id }) => {
      push(next, "Pasted");
      onSelect([id]);
    });
  }, []);

  const onDuplicate = useCallback(() => {
    const { data, config, lastSelectedId, push, onSelect } = ref.current;
    if (!lastSelectedId) return;
    const parent = findParent(data, lastSelectedId);
    if (!parent) return;
    copy(data, lastSelectedId)
      .andThen((component) =>
        paste(
          data,
          parent.parentId,
          parent.slotKey,
          component,
          config.components as ComponentMap,
          parent.index + 1,
        ),
      )
      .map(({ data: next, id }) => {
        push(next, "Duplicated");
        onSelect([id]);
      });
  }, []);

  return { onCopy, onCut, onPaste, onDuplicate };
}
