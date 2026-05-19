import type { ComponentData } from "@puckeditor/core";
import type { Result } from "neverthrow";
import type {
  ComponentType,
  ComponentSlotType,
  Cardinality,
  PatternSlot,
  SectionPattern,
  DerivedVariation,
  PatternConfig,
} from "@duckeditor/spec";

export type {
  ComponentType,
  ComponentSlotType,
  Cardinality,
  PatternSlot,
  SectionPattern,
  DerivedVariation,
  PatternConfig,
};

export type MergeError = { kind: "required-slot-empty"; slotName: string };

export type MergeResult = {
  data: ComponentData;
  /** IDs carried over from the selection — the caller should preserve these when re-minting template IDs. */
  preservedIds: Set<string>;
};

export type PatternRegistry = {
  findApplicable: (data: ComponentData) => SectionPattern[];
  apply: (
    data: ComponentData,
    pattern: SectionPattern,
  ) => Result<MergeResult, MergeError>;
  derive: (componentType: ComponentType) => DerivedVariation[];
  count: (data: ComponentData) => number;
};

export type RemintIds = (
  root: ComponentData,
  preservedIds: Set<string>,
) => ComponentData;
