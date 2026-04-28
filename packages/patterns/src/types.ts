import type { ComponentData, Config } from "@puckeditor/core";
import type { Result } from "neverthrow";

// Puck component type name, e.g. "Stack", "Heading" — key in componentRoles
export type ComponentType = string;

// 'container' is the only built-in structural role; all other role names are consumer-defined
export type ComponentSlotType = string;

export type LayoutTopology =
  | "split"
  | "stacked"
  | "grid"
  | "overlay"
  | "asymmetric";

export type VisualTreatment = "framed" | "contained" | "full-bleed" | "open";

export type InteractionModel = "static" | "tabbed" | "carousel" | "expandable";

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
  tags: {
    topology: LayoutTopology;
    treatment: VisualTreatment[];
    interaction: InteractionModel;
  };
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

// returns false for empty arrays — callers rely on value[0].type being present
export function isNonEmptyComponentDataArray(
  value: unknown,
): value is ComponentData[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof (value[0] as Record<string, unknown>)?.type === "string"
  );
}

export type MergeError = { kind: "required-slot-empty"; slotName: string };

export type PatternRegistry = {
  findApplicable: (data: ComponentData) => SectionPattern[];
  apply: (
    data: ComponentData,
    pattern: SectionPattern,
  ) => Result<ComponentData, MergeError>;
  derive: (componentType: ComponentType) => DerivedVariation[];
  count: (data: ComponentData) => number;
};
