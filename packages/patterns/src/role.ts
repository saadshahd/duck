import type { ComponentData } from "@puckeditor/core";

/** Transparent wrapper — drilled through, contributes no content of its own. */
export const CONTAINER_ROLE = "container" as const;
/** Opaque list — its items are units; never flattened, contributes no content. */
export const COLLECTION_ROLE = "collection" as const;

const STRUCTURAL_ROLES = new Set<string>([CONTAINER_ROLE, COLLECTION_ROLE]);

export function isContainerRole(role: string): boolean {
  return role === CONTAINER_ROLE;
}

export function isCollectionRole(role: string): boolean {
  return role === COLLECTION_ROLE;
}

export function isContentRole(role: string): boolean {
  return !STRUCTURAL_ROLES.has(role);
}

export function buildRoleIndex(
  components: ComponentData[],
  roles: Record<string, string>,
): Map<string, ComponentData[]> {
  const distinctRoles = [
    ...new Set(components.map((c) => roles[c.type]).filter(isContentRole)),
  ];
  return new Map(
    distinctRoles.map((role) => [
      role,
      components.filter((c) => roles[c.type] === role),
    ]),
  );
}
