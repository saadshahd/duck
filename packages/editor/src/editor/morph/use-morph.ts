import { useState, useMemo, useEffect, useCallback } from "react";
import type { Data } from "@puckeditor/core";
import { findById } from "@duck/spec";
import type {
  PatternRegistry,
  SectionPattern,
} from "@duck/patterns";
import { remintIds } from "@duck/patterns";
import { replace } from "../spec-ops/index.js";
import type { DataPush } from "../types.js";

export type MorphState = {
  count: number;
  isOpen: boolean;
  activePattern: SectionPattern | null;
  patterns: SectionPattern[];
  openPicker: () => void;
  closePicker: () => void;
  setActivePattern: (pattern: SectionPattern | null) => void;
  commit: (pattern: SectionPattern) => void;
  commitError: string | null;
};

export function useMorph({
  registry,
  selectedId,
  data,
  push,
}: {
  registry: PatternRegistry | null;
  selectedId: string | null;
  data: Data;
  push: DataPush;
}): MorphState {
  const [isOpen, setIsOpen] = useState(false);
  const [activePattern, setActivePatternState] =
    useState<SectionPattern | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const element = useMemo(
    () => (selectedId ? findById(data, selectedId) : null),
    [data, selectedId],
  );

  const patterns = useMemo(
    () => (registry && element ? registry.findApplicable(element) : []),
    [registry, element],
  );

  useEffect(
    function resetOnSelectionChange() {
      setIsOpen(false);
      setActivePatternState(null);
      setCommitError(null);
    },
    [selectedId],
  );

  const openPicker = useCallback(() => {
    if (patterns.length > 0) setIsOpen(true);
  }, [patterns.length]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setActivePatternState(null);
    setCommitError(null);
  }, []);

  const setActivePattern = useCallback((pattern: SectionPattern | null) => {
    setActivePatternState(pattern);
    setCommitError(null);
  }, []);

  const commit = useCallback(
    (pattern: SectionPattern) => {
      if (!registry || !element || !selectedId) return;
      const applyResult = registry.apply(element, pattern);
      if (applyResult.isErr()) {
        setCommitError(applyResult.error.slotName);
        return;
      }
      const { data: merged, preservedIds } = applyResult.value;
      const reminted = remintIds(merged, preservedIds);
      const replaceResult = replace(data, selectedId, reminted);
      if (replaceResult.isErr()) return;
      push(replaceResult.value, `Morph: ${pattern.name}`);
      setIsOpen(false);
      setActivePatternState(null);
    },
    [registry, element, selectedId, data, push],
  );

  return {
    count: patterns.length,
    isOpen,
    activePattern,
    patterns,
    openPicker,
    closePicker,
    setActivePattern,
    commit,
    commitError,
  };
}
