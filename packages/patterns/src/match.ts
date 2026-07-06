import type { ComponentData } from "@puckeditor/core";
import { slotKeysOf } from "@duckeditor/spec";
import { isCollectionRole, isContainerRole, isContentRole } from "./role.js";
import { isRequired, isPlural } from "./cardinality.js";
import type {
  ComponentSlotType,
  PatternConfig,
  SectionPattern,
} from "./types.js";

export function collectTopLevel(
  data: ComponentData,
  roles: Record<string, ComponentSlotType>,
): ComponentData[] {
  if (isCollectionRole(roles[data.type])) return [];
  return slotKeysOf(data).flatMap((key) =>
    data.props[key].flatMap((child: ComponentData) =>
      isContentRole(roles[child.type])
        ? [child]
        : collectTopLevel(child, roles),
    ),
  );
}

/**
 * Collection subtrees reachable through the same container traversal
 * `collectTopLevel` uses. A collection is an opaque unit: its items are never
 * harvested as content, so a pattern with no collection-accepting slot would
 * silently drop it. Surfacing collections here lets the lossless check count
 * them against slot capacity instead.
 */
export function collectCollections(
  data: ComponentData,
  roles: Record<string, ComponentSlotType>,
): ComponentData[] {
  if (isCollectionRole(roles[data.type])) return [data];
  return slotKeysOf(data).flatMap((key) =>
    data.props[key].flatMap((child: ComponentData) => {
      const role = roles[child.type];
      if (isCollectionRole(role)) return [child];
      return isContainerRole(role) ? collectCollections(child, roles) : [];
    }),
  );
}

export function isApplicable(
  data: ComponentData,
  pattern: SectionPattern,
  config: PatternConfig,
): boolean {
  if (slotKeysOf(data).length === 0) return false;

  const topLevel = collectTopLevel(data, config.componentRoles);
  const collections = collectCollections(data, config.componentRoles);

  const instanceCounts = [...topLevel, ...collections]
    .map((c) => config.componentRoles[c.type])
    .filter((role) => !isContainerRole(role))
    .reduce(
      (counts, role) => counts.set(role, (counts.get(role) ?? 0) + 1),
      new Map<string, number>(),
    );

  const capacityFor = (role: string): number => {
    const accepting = pattern.slots.filter((s) => s.accepts.includes(role));
    return accepting.some((s) => isPlural(s.cardinality))
      ? Infinity
      : accepting.length;
  };

  const lossless = [...instanceCounts].every(
    ([role, count]) => count <= capacityFor(role),
  );

  const requiredSlotsSatisfied = pattern.slots.every((slot) => {
    const hasMatchingContent = topLevel.some((c) =>
      slot.accepts.includes(config.componentRoles[c.type]),
    );
    return !isRequired(slot.cardinality) || hasMatchingContent;
  });

  return lossless && requiredSlotsSatisfied;
}
