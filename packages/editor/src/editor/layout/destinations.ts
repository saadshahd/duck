import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { ComponentData, Data } from "@puckeditor/core";
import {
  collectDescendants,
  findById,
  findParent,
  preOrder,
  slotKeysOf,
} from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { Axis } from "./axis.js";
import { containsPoint } from "./rect.js";
import type { Tiling } from "./tiles.js";

export const NO_TARGET_LABEL = "No target here";

/** The active drop spec the overlay renders for a pointer-driven move: a slot
 *  insert (container), a between-siblings line, or an explicit no-target marker
 *  over the container the pointer is inside. */
export type DropTarget =
  | { kind: "line"; elementId: string; edge: Edge; axis: Axis }
  | {
      kind: "container";
      elementId: string;
      slotKey: string;
      index: number;
      /** Painted destinations over the container; the active slot is `slotKey`. */
      tiling: Tiling;
      activeLabel: string;
    }
  | { kind: "root"; index: number; label: string }
  | { kind: "none"; elementId: string };

/** One reachable drop position in the cycle: a slot append or a between-siblings
 *  insert beside a container. `parentId`/`slotKey` follow spec-ops `move()`:
 *  both null means root content. */
export type Destination = {
  parentId: string | null;
  slotKey: string | null;
  index: number;
  label: string;
};

const ROOT_LABEL = "Root";

/** `Component › slot` qualified destination label. The one source of this
 *  format — tiles, drop-zone labels, and the destination cycle all reuse it. */
export const qualifiedLabel = (
  componentType: string,
  slotKey: string,
): string => `${componentType} › ${slotKey}`;

/** Per-slot qualified labels for a container, keyed by slotKey. */
export const slotLabels = (
  data: Data,
  containerId: string,
): Record<string, string> => {
  const container = findById(data, containerId);
  if (!container) return {};
  return Object.fromEntries(
    slotKeysOf(container).map((slotKey) => [
      slotKey,
      qualifiedLabel(container.type, slotKey),
    ]),
  );
};

/** Container id for a drop target: the target itself for container/no-target
 *  drops, the parent of the line's element otherwise. */
export const resolveContainerId = (
  data: Data,
  target: DropTarget,
): string | null => {
  if (target.kind === "root") return null;
  if (target.kind === "line")
    return findParent(data, target.elementId)?.parentId ?? null;
  return target.elementId;
};

/** Display label for a drop target: `Component › slot` for container drops, the
 *  parent component type for line drops, a constant for no-target. Null when the
 *  container is unknown. */
export const resolveLabel = (data: Data, target: DropTarget): string | null => {
  if (target.kind === "none") return NO_TARGET_LABEL;
  if (target.kind === "root") return target.label;
  const containerId = resolveContainerId(data, target);
  const type = containerId ? findById(data, containerId)?.type : undefined;
  if (!type) return null;
  return target.kind === "container"
    ? qualifiedLabel(type, target.slotKey)
    : type;
};

type Located = {
  component: ComponentData;
  depth: number;
  parentId: string | null;
  slotKey: string | null;
  index: number;
};

/** Containers (slot-bearing) whose border rect holds the point, deepest-first.
 *  Excluded element and its descendants are never candidates. Ties on depth
 *  resolve by document order (preOrder yield order). */
const candidateChain = (args: {
  point: { x: number; y: number };
  data: Data;
  registry: FiberRegistry;
  excluded: ReadonlySet<string>;
}): Located[] => {
  const { point, data, registry, excluded } = args;
  return [...preOrder(data)]
    .flatMap(({ component, path }) => {
      const id = component.props.id as string;
      if (excluded.has(id)) return [];
      if (!slotKeysOf(component).length) return [];
      const rect = registry.get(id)?.getBoundingClientRect();
      if (!rect || !containsPoint(rect, point)) return [];
      const last = path[path.length - 1];
      return [
        {
          component,
          depth: path.length,
          parentId: last.parentId,
          slotKey: last.slotKey,
          index: last.index,
        } satisfies Located,
      ];
    })
    .sort((a, b) => b.depth - a.depth);
};

const slotDestinations = (container: ComponentData): Destination[] =>
  slotKeysOf(container).map((slotKey) => ({
    parentId: container.props.id as string,
    slotKey,
    index: (container.props[slotKey] as ComponentData[]).length,
    label: qualifiedLabel(container.type, slotKey),
  }));

const besideDestination = (located: Located, data: Data): Destination => {
  const index = located.index + 1;
  if (located.parentId === null || located.slotKey === null)
    return { parentId: null, slotKey: null, index, label: ROOT_LABEL };
  const parent = findById(data, located.parentId);
  if (!parent)
    throw new Error(`besideDestination: missing parent ${located.parentId}`);
  return {
    parentId: located.parentId,
    slotKey: located.slotKey,
    index,
    label: qualifiedLabel(parent.type, located.slotKey),
  };
};

const dedupKey = (d: Destination): string =>
  `${d.parentId}|${d.slotKey}|${d.index}`;

/** The cycle of discrete drop positions under the pointer: deepest container's
 *  slots, then beside-it in its parent, repeating up the containment chain to
 *  the root. Pure; same inputs → same output. */
export const destinationStack = (args: {
  point: { x: number; y: number };
  data: Data;
  registry: FiberRegistry;
  excludeId: string;
}): readonly Destination[] => {
  const { point, data, registry, excludeId } = args;
  const excluded = new Set([excludeId, ...collectDescendants(data, excludeId)]);
  const chain = candidateChain({ point, data, registry, excluded });

  const all = chain.flatMap((located) => [
    ...slotDestinations(located.component),
    besideDestination(located, data),
  ]);

  const seen = new Set<string>();
  return all.filter((d) => {
    const key = dedupKey(d);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Wrapping forward step through a stack of length `stackLength`. 0 when empty. */
export const stepCycle = (stackLength: number, current: number): number =>
  stackLength === 0 ? 0 : (current + 1) % stackLength;
