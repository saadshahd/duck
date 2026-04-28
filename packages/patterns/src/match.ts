import type { ComponentData } from "@puckeditor/core";
import type {
  Cardinality,
  ComponentSlotType,
  PatternConfig,
  SectionPattern,
} from "./types.js";
import { isNonEmptyComponentDataArray } from "./types.js";
import { fingerprint } from "./fingerprint.js";

function isRequired(cardinality: Cardinality): boolean {
  return cardinality.kind === "first" || cardinality.kind === "many";
}

export function collectTopLevel(
  component: ComponentData,
  roles: Record<string, ComponentSlotType>,
): ComponentData[] {
  return Object.values(component.props).flatMap((value) => {
    if (!isNonEmptyComponentDataArray(value)) return [];
    return value.flatMap((child) =>
      roles[child.type] === "container"
        ? collectTopLevel(child, roles)
        : [child],
    );
  });
}

export function isApplicable(
  component: ComponentData,
  pattern: SectionPattern,
  config: PatternConfig,
): boolean {
  if (!pattern.appliesTo.includes(fingerprint(component))) return false;

  const topLevel = collectTopLevel(component, config.componentRoles);

  const selectionRoles = new Set(
    topLevel
      .map((c) => config.componentRoles[c.type])
      .filter((role): role is string => role !== undefined),
  );
  for (const role of selectionRoles) {
    if (!pattern.slots.some((s) => s.accepts.includes(role))) return false;
  }

  return pattern.slots.every((slot) => {
    if (!isRequired(slot.cardinality)) return true;
    return topLevel.some((c) => {
      const role = config.componentRoles[c.type];
      return role !== undefined && slot.accepts.includes(role);
    });
  });
}
