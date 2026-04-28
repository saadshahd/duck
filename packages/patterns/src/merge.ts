import type { ComponentData } from "@puckeditor/core";
import { ok, err, type Result } from "neverthrow";
import { mapComponent, slotKeysOf } from "@duck/spec";
import {
  type PatternSlot,
  type SectionPattern,
  type PatternConfig,
  type MergeError,
} from "./types.js";
import { isContainerRole, buildRoleIndex } from "./role.js";
import { isRequired, isPlural } from "./cardinality.js";
import { collectTopLevel } from "./match.js";

function replacePlaceholder(
  node: ComponentData,
  accepts: string[],
  roles: Record<string, string>,
  targetNth: number,
  replacements: ComponentData[],
): ComponentData {
  const seen = { n: 0 };

  function visit(child: ComponentData): ComponentData[] {
    const role = roles[child.type];
    if (accepts.includes(role)) {
      return seen.n++ === targetNth ? replacements : [child];
    }
    return isContainerRole(role) ? [mapComponent(child, visit)] : [child];
  }

  return mapComponent(node, visit);
}

function selectContent(
  slot: PatternSlot,
  matched: ComponentData[],
): Result<ComponentData[] | null, MergeError> {
  if (matched.length === 0) {
    return isRequired(slot.cardinality)
      ? err({ kind: "required-slot-empty", slotName: slot.name })
      : ok(null);
  }
  return ok(isPlural(slot.cardinality) ? matched : [matched[0]]);
}

function precomputeNths(
  slots: readonly PatternSlot[],
): Map<PatternSlot, number> {
  const counter = new Map<string, number>();
  return new Map(
    slots.map((slot) => {
      const key = [...slot.accepts].sort().join(",");
      const nth = counter.get(key) ?? 0;
      counter.set(key, nth + 1);
      return [slot, nth] as [PatternSlot, number];
    }),
  );
}

function drainPlaced(
  pool: Map<string, ComponentData[]>,
  placed: ComponentData[],
): Map<string, ComponentData[]> {
  const placedSet = new Set(placed);
  return new Map(
    [...pool.entries()].map(([role, items]) => [
      role,
      items.filter((c) => !placedSet.has(c)),
    ]),
  );
}

function inheritRootProps(
  data: ComponentData,
  template: ComponentData,
): Record<string, unknown> {
  if (data.type !== template.type) return {};
  const slotKeys = new Set(slotKeysOf(data));
  return Object.fromEntries(
    Object.entries(data.props).filter(
      ([key]) => !slotKeys.has(key) && key !== "id",
    ),
  );
}

export function merge(
  data: ComponentData,
  pattern: SectionPattern,
  config: PatternConfig,
): Result<ComponentData, MergeError> {
  const topLevel = collectTopLevel(data, config.componentRoles);
  const pool = buildRoleIndex(topLevel, config.componentRoles);

  const template = structuredClone(pattern.data) as ComponentData;
  const base = {
    ...template,
    props: {
      ...template.props,
      ...inheritRootProps(data, template),
      id: data.props.id,
    },
  } as ComponentData;

  const nths = precomputeNths(pattern.slots);

  type State = { working: ComponentData; pool: Map<string, ComponentData[]> };

  return pattern.slots
    .reduce<Result<State, MergeError>>(
      (acc, slot) =>
        acc.andThen(({ working, pool: currentPool }) => {
          const nth = nths.get(slot)!;
          const matched = slot.accepts.flatMap(
            (role) => currentPool.get(role) ?? [],
          );
          return selectContent(slot, matched).map((content) => {
            if (!content) return { working, pool: currentPool };
            const next = replacePlaceholder(
              working,
              slot.accepts,
              config.componentRoles,
              nth,
              content,
            );
            return { working: next, pool: drainPlaced(currentPool, content) };
          });
        }),
      ok({ working: base, pool }),
    )
    .map(({ working }) => working);
}
