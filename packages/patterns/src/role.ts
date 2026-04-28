import type { ComponentData } from "@puckeditor/core";

export const CONTAINER_ROLE = "container" as const;

function isRole(role: string, target: string): boolean {
  return role === target;
}

export function isContainerRole(role: string): boolean {
  return isRole(role, CONTAINER_ROLE);
}

export function isContentRole(role: string): boolean {
  return !isRole(role, CONTAINER_ROLE);
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
