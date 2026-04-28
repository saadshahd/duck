import type { ComponentData } from "@puckeditor/core";
import type { Result } from "neverthrow";

// Puck component type name, e.g. "Stack", "Heading" — key in componentRoles
export type ComponentType = string;

// All other role names are consumer-defined
export type ComponentSlotType = string;

export type Cardinality =
  | { kind: "first" } // first match; inapplicable if zero
  | { kind: "optional" } // match or template default
  | { kind: "many" } // one or more, document order
  | { kind: "any" }; // zero or more, document order

export type PatternSlot = {
  name: string;
  accepts: [ComponentSlotType, ...ComponentSlotType[]]; // non-empty
  cardinality: Cardinality;
};

export type SectionPattern = {
  name: string;
  description: string;
  slots: [PatternSlot, ...PatternSlot[]]; // non-empty
  data: ComponentData; // template with default instances
};

export type DerivedVariation = {
  name: string;
  componentType: string;
  props: Record<string, unknown>; // partial prop overrides
};

export type PatternConfig = {
  componentRoles: Record<ComponentType, ComponentSlotType>;
  patterns: SectionPattern[];
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
