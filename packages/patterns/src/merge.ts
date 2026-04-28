import type { ComponentData } from "@puckeditor/core";
import { ok, err, type Result } from "neverthrow";
import type {
  ComponentSlotType,
  SectionPattern,
  PatternConfig,
  MergeError,
} from "./types.js";
import { collectTopLevel } from "./match.js";

function mintId(counter: { n: number }): string {
  return `pattern-node-${++counter.n}`;
}

function isComponentDataArray(value: unknown): value is ComponentData[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof (value[0] as Record<string, unknown>)?.type === "string"
  );
}

// DFS walk: find the Nth placeholder node whose role is in accepts, replace it
// with replacements. Returns true when replacement was made.
function replacePlaceholder(
  node: ComponentData,
  accepts: ComponentSlotType[],
  roles: Record<string, ComponentSlotType>,
  nth: number,
  replacements: ComponentData[],
  counter: { n: number },
): boolean {
  for (const value of Object.values(node.props)) {
    if (!isComponentDataArray(value)) continue;
    const arr = value as ComponentData[];
    for (let i = 0; i < arr.length; i++) {
      const child = arr[i];
      const role = roles[child.type];
      if (role !== undefined && accepts.includes(role)) {
        if (counter.n === nth) {
          arr.splice(i, 1, ...replacements);
          return true;
        }
        counter.n++;
      } else {
        // Recurse into containers and unknown nodes
        if (
          replacePlaceholder(child, accepts, roles, nth, replacements, counter)
        )
          return true;
      }
    }
  }
  return false;
}

// Re-mint IDs for container nodes that came from the template (not merged content).
// isRoot skips the root node itself — its ID came from the template and was
// potentially overwritten by the root-container-exception merge.
function remintContainerIds(
  node: ComponentData,
  roles: Record<string, ComponentSlotType>,
  counter: { n: number },
  isRoot: boolean = false,
): void {
  const role = roles[node.type];
  if (!isRoot && role === "container") {
    (node.props as Record<string, unknown>).id = mintId(counter);
  }
  for (const value of Object.values(node.props)) {
    if (!isComponentDataArray(value)) continue;
    for (const child of value) {
      remintContainerIds(child, roles, counter);
    }
  }
}

export function merge(
  selection: ComponentData,
  pattern: SectionPattern,
  config: PatternConfig,
): Result<ComponentData, MergeError> {
  // Step 1: build typed multimap from selection's top-level content nodes
  const topLevel = collectTopLevel(selection, config.componentRoles);
  const multimap = new Map<ComponentSlotType, ComponentData[]>(
    (
      [
        "figure",
        "heading",
        "body",
        "action",
        "container",
      ] as ComponentSlotType[]
    ).map((role) => [role, []]),
  );
  for (const component of topLevel) {
    const role = config.componentRoles[component.type];
    if (role === undefined) continue;
    multimap.get(role)!.push(component);
  }

  // Step 2: deep-clone template; apply root container exception if types match.
  // Only merge scalar/layout props from the selection — child arrays stay from
  // the template so the DFS placeholder walk has the right structure to fill.
  const working = structuredClone(pattern.data) as ComponentData;
  if (selection.type === pattern.data.type) {
    const scalarSelectionProps = Object.fromEntries(
      Object.entries(selection.props).filter(
        ([, v]) => !isComponentDataArray(v),
      ),
    );
    // Spread from working.props (the clone), not pattern.data.props, so child
    // arrays remain the deep-cloned copies — not references back to the template.
    (working.props as Record<string, unknown>) = {
      ...working.props,
      ...scalarSelectionProps,
      id: working.props.id,
    };
  }

  // Step 3: for each slot in declaration order, collect matches and place them
  // Track slot index among slots sharing the same accepts signature (for Nth placeholder)
  const slotIndexByAccepts = new Map<string, number>();

  for (const slot of pattern.slots) {
    const acceptsKey = slot.accepts.join(",");
    const nth = slotIndexByAccepts.get(acceptsKey) ?? 0;

    // Collect from multimap in slot.accepts order (document order preserved within each role)
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
          // Keep template default — skip replacement, advance placeholder index
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
          // Keep template default — skip replacement, advance placeholder index
          slotIndexByAccepts.set(acceptsKey, nth + 1);
          continue;
        }
        toPlace = matched;
        break;
    }

    replacePlaceholder(
      working,
      slot.accepts,
      config.componentRoles,
      nth,
      toPlace,
      { n: 0 },
    );

    // Remove placed components from multimap so each is used once
    for (const placed of toPlace) {
      const role = config.componentRoles[placed.type];
      if (role === undefined) continue;
      const bucket = multimap.get(role);
      if (bucket === undefined) continue;
      const idx = bucket.indexOf(placed);
      if (idx !== -1) bucket.splice(idx, 1);
    }

    slotIndexByAccepts.set(acceptsKey, nth + 1);
  }

  // Step 4: re-mint IDs for structural container nodes that came from the template
  remintContainerIds(working, config.componentRoles, { n: 0 }, true);

  return ok(working);
}
