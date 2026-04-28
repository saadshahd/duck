import type { ComponentData } from "@puckeditor/core";
import { slotKeysOf } from "@json-render-editor/spec";
import { isContainerRole, isContentRole } from "./role.js";
import { isRequired } from "./cardinality.js";
import type {
  ComponentSlotType,
  PatternConfig,
  SectionPattern,
} from "./types.js";

export function collectTopLevel(
  data: ComponentData,
  roles: Record<string, ComponentSlotType>,
): ComponentData[] {
  return slotKeysOf(data).flatMap((key) =>
    data.props[key].flatMap((child: ComponentData) =>
      isContainerRole(roles[child.type])
        ? collectTopLevel(child, roles)
        : [child],
    ),
  );
}

export function isApplicable(
  data: ComponentData,
  pattern: SectionPattern,
  config: PatternConfig,
): boolean {
  const topLevel = collectTopLevel(data, config.componentRoles);

  const contentRoles = new Set(
    topLevel.map((c) => config.componentRoles[c.type]).filter(isContentRole),
  );

  const lossless = [...contentRoles].every((role) =>
    pattern.slots.some((s) => s.accepts.includes(role)),
  );

  const requiredSlotsSatisfied = pattern.slots.every((slot) => {
    const hasMatchingContent = topLevel.some((c) =>
      slot.accepts.includes(config.componentRoles[c.type]),
    );
    return !isRequired(slot.cardinality) || hasMatchingContent;
  });

  return lossless && requiredSlotsSatisfied;
}
