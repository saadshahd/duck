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
  selectedId: string | null;
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
    const { spec, selectedId } = ref.current;
    if (!selectedId) return;
    serializeFragment(spec, selectedId).map(writeClipboard);
  }, []);

  const onCut = useCallback(() => {
    const { spec, selectedId, push, onDeselect } = ref.current;
    if (!selectedId) return;
    serializeFragment(spec, selectedId)
      .andThen((fragment) => {
        writeClipboard(fragment);
        return deleteElement(spec, selectedId);
      })
      .map(({ spec: newSpec }) => {
        push(newSpec, "Cut", "clipboard");
        onDeselect();
      });
  }, []);

  const onPaste = useCallback(async () => {
    const capturedId = ref.current.selectedId;
    const fragment = await readClipboard();
    if (!fragment) return;

    const { spec, push, onSelect } = ref.current;
    const remapped = deserializeFragment(
      fragment,
      new Set(Object.keys(spec.elements)),
    );

    insertFragment(spec, remapped, capturedId ?? spec.root).map((newSpec) => {
      push(newSpec, "Paste", "clipboard");
      onSelect(remapped.root);
    });
  }, []);

  const onDuplicate = useCallback(() => {
    const { spec, selectedId, push, onSelect } = ref.current;
    if (!selectedId) return;
    duplicate(spec, selectedId).map(({ spec: newSpec, newRootId }) => {
      push(newSpec, "Duplicate", "clipboard");
      onSelect(newRootId);
    });
  }, []);

  return { onCopy, onCut, onPaste, onDuplicate };
}
