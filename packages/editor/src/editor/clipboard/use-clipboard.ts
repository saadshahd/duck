import { useCallback, useRef } from "react";
import type { Spec } from "@json-render/core";
import {
  serializeFragment,
  deserializeFragment,
  insertFragment,
  duplicate,
  deleteElements,
  type SpecFragment,
} from "../spec-ops/index.js";
import type { SpecPush } from "../types.js";

// --- Types ---

type ClipboardDeps = {
  spec: Spec;
  selectedIds: ReadonlySet<string>;
  lastSelectedId: string | null;
  push: SpecPush;
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

const FRAGMENT_TYPE = "json-render-fragment";

const writeFragment = (fragment: SpecFragment): void => {
  navigator.clipboard.writeText(JSON.stringify(fragment)).catch(() => {});
};

const readFragment = async (): Promise<SpecFragment | null> => {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text) as Record<string, unknown>;
    if (data?._type !== FRAGMENT_TYPE) return null;
    // Normalize legacy single-root format
    const roots = (data.roots ?? [data.root]) as string[];
    return { ...data, roots } as SpecFragment;
  } catch {
    return null;
  }
};

const pluralLabel = (verb: string, count: number): string =>
  count > 1 ? `${verb} ${count} elements` : verb;

// --- Hook ---

export function useClipboard(deps: ClipboardDeps): ClipboardActions {
  const ref = useRef(deps);
  ref.current = deps;

  const onCopy = useCallback(() => {
    const { spec, selectedIds } = ref.current;
    if (selectedIds.size === 0) return;
    serializeFragment(spec, selectedIds).map(writeFragment);
  }, []);

  const onCut = useCallback(() => {
    const { spec, selectedIds, push, onDeselect } = ref.current;
    if (selectedIds.size === 0) return;
    serializeFragment(spec, selectedIds)
      .andThen((fragment) => {
        writeFragment(fragment);
        return deleteElements(spec, selectedIds);
      })
      .map(({ spec: newSpec }) => {
        push(newSpec, pluralLabel("Cut", selectedIds.size));
        onDeselect();
      });
  }, []);

  const onPaste = useCallback(async () => {
    const capturedId = ref.current.lastSelectedId;
    const fragment = await readFragment();
    if (!fragment) return;

    const { spec, push, onSelect } = ref.current;
    const remapped = deserializeFragment(
      fragment,
      new Set(Object.keys(spec.elements)),
    );

    const target = capturedId ?? spec.root;
    const position: { tag: "child" | "after" } = spec.elements[target]?.children
      ? { tag: "child" }
      : { tag: "after" };

    insertFragment(spec, remapped, target, position).map((newSpec) => {
      push(newSpec, pluralLabel("Pasted", remapped.roots.length));
      onSelect(remapped.roots);
    });
  }, []);

  const onDuplicate = useCallback(() => {
    const { spec, selectedIds, push, onSelect } = ref.current;
    if (selectedIds.size === 0) return;
    duplicate(spec, selectedIds).map(({ spec: newSpec, newRootIds }) => {
      push(newSpec, pluralLabel("Duplicated", newRootIds.length));
      onSelect(newRootIds);
    });
  }, []);

  return { onCopy, onCut, onPaste, onDuplicate };
}
