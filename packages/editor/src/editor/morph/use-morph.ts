import { useState, useMemo, useEffect, useCallback } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import {
  findById,
  type DerivedVariation,
  type SectionPattern,
} from "@duckeditor/spec";
import type { PatternRegistry, RemintIds } from "@duckeditor/patterns";
import { replace, update } from "../spec-ops/index.js";
import type { EditorCommit } from "../types.js";
import { quickVariants, withVariant } from "./quick-variants.js";

export type MorphEntry =
  | { kind: "pattern"; pattern: SectionPattern }
  | { kind: "variant"; variant: DerivedVariation };

type MorphState = {
  count: number;
  isOpen: boolean;
  activeEntry: MorphEntry | null;
  overlayData: ComponentData | null;
  entries: MorphEntry[];
  openPicker: () => void;
  closePicker: () => void;
  setActiveEntry: (entry: MorphEntry | null) => void;
  commit: (entry: MorphEntry) => void;
  commitError: string | null;
};

export function useMorph({
  registry,
  remintIds,
  selectedId,
  data,
  config,
  commit: commitData,
}: {
  registry: PatternRegistry | null;
  remintIds: RemintIds | null;
  selectedId: string | null;
  data: Data;
  config: Config;
  commit: EditorCommit;
}): MorphState {
  const [isOpen, setIsOpen] = useState(false);
  const [activeEntry, setActiveEntryState] = useState<MorphEntry | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const element = useMemo(
    () => (selectedId ? findById(data, selectedId) : null),
    [data, selectedId],
  );

  const entries = useMemo<MorphEntry[]>(() => {
    if (!registry || !element) return [];
    return [
      ...registry
        .findApplicable(element)
        .map((pattern) => ({ kind: "pattern" as const, pattern })),
      ...quickVariants({
        variations: registry.derive(element.type),
        config,
        element,
      }).map((variant) => ({ kind: "variant" as const, variant })),
    ];
  }, [registry, element, config]);

  // The previewed element for the active entry: the pattern applied (or variant
  // props merged) onto the selected element. Null unless the picker is open with
  // an active choice — the morph overlay renders exactly this.
  const overlayData = useMemo<ComponentData | null>(() => {
    if (!isOpen || !activeEntry || !element) return null;
    if (activeEntry.kind === "variant")
      return withVariant(element, activeEntry.variant);
    if (!registry) return null;
    const result = registry.apply(element, activeEntry.pattern);
    if (result.isErr()) return null;
    return result.value.data;
  }, [isOpen, activeEntry, element, registry]);

  useEffect(
    function resetOnSelectionChange() {
      setIsOpen(false);
      setActiveEntryState(null);
      setCommitError(null);
    },
    [selectedId],
  );

  const openPicker = useCallback(() => {
    if (entries.length > 0) setIsOpen(true);
  }, [entries.length]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setActiveEntryState(null);
    setCommitError(null);
  }, []);

  const setActiveEntry = useCallback((entry: MorphEntry | null) => {
    setActiveEntryState(entry);
    setCommitError(null);
  }, []);

  const commitPattern = useCallback(
    (pattern: SectionPattern) => {
      if (!registry || !remintIds || !element || !selectedId) return;
      const applyResult = registry.apply(element, pattern);
      if (applyResult.isErr()) {
        setCommitError(applyResult.error.slotName);
        return;
      }
      const { data: merged, preservedIds } = applyResult.value;
      const reminted = remintIds(merged, preservedIds);
      const replaceResult = replace(data, selectedId, reminted);
      if (replaceResult.isErr()) return;
      commitData({
        beforeData: data,
        afterData: replaceResult.value,
        label: `Morph: ${pattern.name}`,
        resolve: { kind: "morph", id: selectedId },
      });
      closePicker();
    },
    [registry, remintIds, element, selectedId, data, commitData, closePicker],
  );

  const commitVariant = useCallback(
    (variant: DerivedVariation) => {
      if (!element || !selectedId) return;
      const updateResult = update(
        data,
        selectedId,
        withVariant(element, variant).props,
        config,
      );
      if (updateResult.isErr()) return;
      commitData({
        beforeData: data,
        afterData: updateResult.value,
        label: `Variant: ${variant.name}`,
        resolve: { kind: "morph", id: selectedId },
      });
      closePicker();
    },
    [element, selectedId, data, config, commitData, closePicker],
  );

  const commit = useCallback(
    (entry: MorphEntry) =>
      entry.kind === "pattern"
        ? commitPattern(entry.pattern)
        : commitVariant(entry.variant),
    [commitPattern, commitVariant],
  );

  return {
    count: entries.length,
    isOpen,
    activeEntry,
    overlayData,
    entries,
    openPicker,
    closePicker,
    setActiveEntry,
    commit,
    commitError,
  };
}
