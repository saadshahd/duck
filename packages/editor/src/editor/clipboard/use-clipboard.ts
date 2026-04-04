import { useCallback, useRef } from "react";
import type { Spec } from "@json-render/core";
import {
  serializeFragment,
  deserializeFragment,
  insertFragment,
  duplicate,
  deleteElement,
  type SpecFragment,
} from "../spec-ops/index.js";
import type { SpecPush } from "../types.js";

type ClipboardDeps = {
  spec: Spec;
  lastSelectedId: string | null;
  push: SpecPush;
  onSelect: (elementId: string) => void;
  onDeselect: () => void;
};

export type ClipboardActions = {
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
};

const FRAGMENT_TYPE = "json-render-fragment" as const;

const isFragment = (data: unknown): data is SpecFragment =>
  typeof data === "object" &&
  data !== null &&
  "_type" in data &&
  (data as SpecFragment)._type === FRAGMENT_TYPE;

const writeClipboard = (fragment: SpecFragment): void => {
  navigator.clipboard.writeText(JSON.stringify(fragment)).catch(() => {});
};

const readClipboard = async (): Promise<SpecFragment | null> => {
  try {
    const text = await navigator.clipboard.readText();
    const parsed: unknown = JSON.parse(text);
    return isFragment(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export function useClipboard(deps: ClipboardDeps): ClipboardActions {
  const ref = useRef(deps);
  ref.current = deps;

  const onCopy = useCallback(() => {
    const { spec, lastSelectedId } = ref.current;
    if (!lastSelectedId) return;
    serializeFragment(spec, lastSelectedId).map(writeClipboard);
  }, []);

  const onCut = useCallback(() => {
    const { spec, lastSelectedId, push, onDeselect } = ref.current;
    if (!lastSelectedId) return;
    serializeFragment(spec, lastSelectedId)
      .andThen((fragment) => {
        writeClipboard(fragment);
        return deleteElement(spec, lastSelectedId);
      })
      .map(({ spec: newSpec }) => {
        push(newSpec, "Cut");
        onDeselect();
      });
  }, []);

  const onPaste = useCallback(async () => {
    const capturedId = ref.current.lastSelectedId;
    const fragment = await readClipboard();
    if (!fragment) return;

    const { spec, push, onSelect } = ref.current;
    const remapped = deserializeFragment(
      fragment,
      new Set(Object.keys(spec.elements)),
    );

    const target = capturedId ?? spec.root;
    const hasChildren = !!spec.elements[target]?.children;
    const position = hasChildren
      ? { tag: "child" as const }
      : { tag: "after" as const };

    insertFragment(spec, remapped, target, position).map((newSpec) => {
      push(newSpec, "Paste");
      onSelect(remapped.root);
    });
  }, []);

  const onDuplicate = useCallback(() => {
    const { spec, lastSelectedId, push, onSelect } = ref.current;
    if (!lastSelectedId) return;
    duplicate(spec, lastSelectedId).map(({ spec: newSpec, newRootId }) => {
      push(newSpec, "Duplicate");
      onSelect(newRootId);
    });
  }, []);

  return { onCopy, onCut, onPaste, onDuplicate };
}
