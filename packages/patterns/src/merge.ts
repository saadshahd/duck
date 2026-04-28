import type { ComponentData } from "@puckeditor/core";
import { ok, err, type Result } from "neverthrow";
import type { SectionPattern, PatternConfig, MergeError } from "./types.js";
import { isNonEmptyComponentDataArray } from "./types.js";
import { collectTopLevel } from "./match.js";

function mintId(counter: { n: number }): string {
  return `pattern-node-${++counter.n}`;
}

function replacePlaceholder(
  node: ComponentData,
  accepts: string[],
  roles: Record<string, string>,
  targetNth: number,
  replacements: ComponentData[],
  seen: { n: number },
): ComponentData {
  const newProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node.props)) {
    if (!isNonEmptyComponentDataArray(value)) {
      newProps[key] = value;
      continue;
    }
    const newArr: ComponentData[] = [];
    for (const child of value) {
      const role = roles[child.type];
      if (role !== undefined && accepts.includes(role)) {
        if (seen.n === targetNth) {
          newArr.push(...replacements);
        } else {
          newArr.push(child);
        }
        seen.n++;
      } else if (role === "container") {
        newArr.push(
          replacePlaceholder(
            child,
            accepts,
            roles,
            targetNth,
            replacements,
            seen,
          ),
        );
      } else {
        newArr.push(child);
      }
    }
    newProps[key] = newArr;
  }
  return { ...node, props: newProps } as ComponentData;
}

function remintChildren(
  node: ComponentData,
  roles: Record<string, string>,
  counter: { n: number },
): ComponentData {
  const newProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node.props)) {
    if (!isNonEmptyComponentDataArray(value)) {
      newProps[key] = value;
      continue;
    }
    newProps[key] = (value as ComponentData[]).map((child) => {
      const withNewId =
        roles[child.type] === "container"
          ? { ...child, props: { ...child.props, id: mintId(counter) } }
          : child;
      return remintChildren(withNewId, roles, counter);
    });
  }
  return { ...node, props: newProps } as ComponentData;
}

export function merge(
  data: ComponentData,
  pattern: SectionPattern,
  config: PatternConfig,
): Result<ComponentData, MergeError> {
  const topLevel = collectTopLevel(data, config.componentRoles);

  const distinctRoles = [
    ...new Set(
      topLevel
        .map((c) => config.componentRoles[c.type])
        .filter((r): r is string => r !== undefined && r !== "container"),
    ),
  ];
  const multimap = new Map<string, ComponentData[]>(
    distinctRoles.map((role) => [
      role,
      topLevel.filter((c) => config.componentRoles[c.type] === role),
    ]),
  );

  let working = structuredClone(pattern.data) as ComponentData;
  if (data.type === pattern.data.type) {
    const scalarDataProps = Object.fromEntries(
      Object.entries(data.props).filter(
        ([, v]) => !isNonEmptyComponentDataArray(v),
      ),
    );
    (working.props as Record<string, unknown>) = {
      ...working.props,
      ...scalarDataProps,
      id: working.props.id,
    };
  }

  const slotIndexByAccepts = new Map<string, number>();

  for (const slot of pattern.slots) {
    const acceptsKey = [...slot.accepts].sort().join(",");
    const nth = slotIndexByAccepts.get(acceptsKey) ?? 0;

    const matched: ComponentData[] = slot.accepts.flatMap(
      (role) => multimap.get(role) ?? [],
    );

    let toPlace: ComponentData[];

    switch (slot.cardinality.kind) {
      case "first":
        if (matched.length === 0) {
          return err({ kind: "required-slot-empty", slotName: slot.name });
        }
        toPlace = [matched[0]];
        break;
      case "optional":
        if (matched.length === 0) {
          slotIndexByAccepts.set(acceptsKey, nth + 1);
          continue;
        }
        toPlace = [matched[0]];
        break;
      case "many":
        if (matched.length === 0) {
          return err({ kind: "required-slot-empty", slotName: slot.name });
        }
        toPlace = matched;
        break;
      case "any":
        if (matched.length === 0) {
          slotIndexByAccepts.set(acceptsKey, nth + 1);
          continue;
        }
        toPlace = matched;
        break;
    }

    working = replacePlaceholder(
      working,
      slot.accepts,
      config.componentRoles,
      nth,
      toPlace,
      { n: 0 },
    );

    for (const placed of toPlace) {
      const role = config.componentRoles[placed.type];
      if (role === undefined) continue;
      const bucket = multimap.get(role) ?? [];
      multimap.set(
        role,
        bucket.filter((c) => c !== placed),
      );
    }

    slotIndexByAccepts.set(acceptsKey, nth + 1);
  }

  const minted = remintChildren(working, config.componentRoles, { n: 0 });

  return ok(minted);
}
