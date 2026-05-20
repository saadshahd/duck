import { useCallback, useRef } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { collectDescendants, findParent } from "@duckeditor/spec";
import { copy, paste, remove } from "../spec-ops/index.js";
import {
  type ClipboardActions,
  type EditorCommit,
} from "../types.js";

type ClipboardDeps = {
  data: Data;
  config: Config;
  lastSelectedId: string | null;
  commit: EditorCommit;
  onSelect: (elementIds: string[]) => void;
  onDeselect: () => void;
};

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

export function useClipboard(deps: ClipboardDeps): ClipboardActions {
  const ref = useRef(deps);
  ref.current = deps;

  const onCopy = useCallback(() => {
    const { data, selectedElementId } = ref.current;
    if (!selectedElementId) return;
    copy(data, selectedElementId).map(writeFragment);
  }, []);

  const onCut = useCallback(() => {
    const { data, lastSelectedId, commit, onDeselect } = ref.current;
    if (!lastSelectedId) return;
    const removedIds = [
      lastSelectedId,
      ...collectDescendants(data, lastSelectedId),
    ];
    copy(data, lastSelectedId)
      .andThen((component) => {
        writeFragment(component);
        return remove(data, selectedElementId);
      })
      .map((next) => {
        commit({
          beforeData: data,
          afterData: next,
          label: "Cut",
          resolve: { kind: "remove", ids: removedIds },
        });
        onDeselect();
      });
  }, []);

  const onPaste = useCallback(async () => {
    const component = await readFragment();
    if (!component) return;

    const { data, config, lastSelectedId, commit, onSelect } = ref.current;
    const position = pastePosition(data, lastSelectedId);
    if (!position) return;

    paste(
      data,
      position.parentId,
      position.slotKey,
      component,
      config,
      position.index,
    ).map(({ data: next, id }) => {
      commit({
        beforeData: data,
        afterData: next,
        label: "Pasted",
        resolve: { kind: "insert", id },
      });
      onSelect([id]);
    });
  }, []);

  const onDuplicate = useCallback(() => {
    const { data, config, lastSelectedId, commit, onSelect } =
      ref.current;
    if (!lastSelectedId) return;
    const parent = findParent(data, lastSelectedId);
    if (!parent) return;
    copy(data, selectedElementId)
      .andThen((component) =>
        paste(
          data,
          parent.parentId,
          parent.slotKey,
          component,
          config,
          parent.index + 1,
        ),
      )
      .map(({ data: next, id }) => {
        commit({
          beforeData: data,
          afterData: next,
          label: "Duplicated",
          resolve: { kind: "insert", id },
        });
        onSelect([id]);
      });
  }, []);

  return { onCopy, onCut, onPaste, onDuplicate };
}
