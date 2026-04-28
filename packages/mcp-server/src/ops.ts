import { Data as EffectData, Effect } from "effect";
import type { ComponentData, Config, Data } from "@puckeditor/core";

// ── Types ───────────────────────────────────────────────────────────

export type Op =
  | {
      readonly op: "add";
      readonly parentId: string | null;
      readonly slotKey: string | null;
      readonly index?: number;
      readonly component: ComponentData;
    }
  | {
      readonly op: "update";
      readonly id: string;
      readonly props: Record<string, unknown>;
    }
  | { readonly op: "remove"; readonly id: string }
  | {
      readonly op: "move";
      readonly id: string;
      readonly toParentId: string | null;
      readonly toSlotKey: string | null;
      readonly toIndex: number;
    };

export class OpError extends EffectData.TaggedError("OpError")<{
  readonly tag:
    | "element-not-found"
    | "parent-not-found"
    | "slot-not-defined"
    | "index-out-of-bounds"
    | "circular-move"
    | "unknown-component";
  readonly details: Record<string, unknown>;
}> {
  // fallow-ignore-next-line unused-class-member
  get hint() {
    return `Op failed (${this.tag}): ${JSON.stringify(this.details)}`;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

const opErr = (
  tag: OpError["tag"],
  details: Record<string, unknown>,
): OpError => new OpError({ tag, details });

const slotKeysFromConfig = (config: Config, type: string): string[] => {
  const fields = (
    config.components as Record<
      string,
      { fields?: Record<string, { type: string }> }
    >
  )[type]?.fields;
  if (!fields) return [];
  return Object.entries(fields)
    .filter(([, f]) => f?.type === "slot")
    .map(([k]) => k);
};

const isKnownComponent = (config: Config, type: string): boolean =>
  type in (config.components as Record<string, unknown>);

const generateId = (type: string): string =>
  `${type}-${Math.random().toString(36).slice(2, 10)}`;

/** Walk all child arrays of a component (its slot props) producing [slotKey, array] pairs. */
const slotEntries = (
  component: ComponentData,
): Array<readonly [string, ComponentData[]]> => {
  const props = (component.props ?? {}) as Record<string, unknown>;
  const out: Array<readonly [string, ComponentData[]]> = [];
  for (const [key, value] of Object.entries(props)) {
    if (
      Array.isArray(value) &&
      value.every((v) => v && typeof v === "object" && "type" in v)
    ) {
      out.push([key, value as ComponentData[]]);
    }
  }
  return out;
};

/** Mutating: find a component by id and visit it. Returns true if found. */
const visitById = (
  data: Data,
  id: string,
  visit: (node: ComponentData) => void,
): boolean => {
  const visitArr = (arr: ComponentData[]): boolean => {
    for (const node of arr) {
      if ((node.props as { id?: string })?.id === id) {
        visit(node);
        return true;
      }
      for (const [, children] of slotEntries(node)) {
        if (visitArr(children)) return true;
      }
    }
    return false;
  };
  return visitArr(data.content);
};

const findById = (data: Data, id: string): ComponentData | null => {
  let found: ComponentData | null = null;
  visitById(data, id, (node) => {
    found = node;
  });
  return found;
};

/** Find the array containing `id` plus its index. null if id is not in tree. */
type ParentSite = {
  readonly array: ComponentData[];
  readonly index: number;
  readonly parentId: string | null;
  readonly slotKey: string | null;
};

const findParentSite = (data: Data, id: string): ParentSite | null => {
  const search = (
    arr: ComponentData[],
    parentId: string | null,
    slotKey: string | null,
  ): ParentSite | null => {
    for (let i = 0; i < arr.length; i++) {
      const node = arr[i]!;
      if ((node.props as { id?: string })?.id === id) {
        return { array: arr, index: i, parentId, slotKey };
      }
      const nodeId = (node.props as { id?: string })?.id ?? null;
      for (const [key, children] of slotEntries(node)) {
        const hit = search(children, nodeId, key);
        if (hit) return hit;
      }
    }
    return null;
  };
  return search(data.content, null, null);
};

const collectIds = (component: ComponentData): Set<string> => {
  const ids = new Set<string>();
  const walk = (node: ComponentData) => {
    const id = (node.props as { id?: string })?.id;
    if (id) ids.add(id);
    for (const [, children] of slotEntries(node)) {
      for (const child of children) walk(child);
    }
  };
  walk(component);
  return ids;
};

/** Resolve the target array for an add/move: data.content if parentId is null,
 *  else parent.props[slotKey]. Validates parent exists, slot is declared. */
const resolveTargetArray = (
  data: Data,
  config: Config,
  parentId: string | null,
  slotKey: string | null,
): Effect.Effect<ComponentData[], OpError> => {
  if (parentId === null) {
    return Effect.succeed(data.content);
  }
  const parent = findById(data, parentId);
  if (!parent) return Effect.fail(opErr("parent-not-found", { parentId }));
  if (!slotKey)
    return Effect.fail(
      opErr("slot-not-defined", {
        parentId,
        type: parent.type,
        reason: "slotKey is required when parentId is set",
      }),
    );
  const declared = slotKeysFromConfig(config, parent.type);
  if (!declared.includes(slotKey))
    return Effect.fail(
      opErr("slot-not-defined", {
        parentId,
        type: parent.type,
        slotKey,
        declared,
      }),
    );
  const props = parent.props as Record<string, unknown>;
  if (!Array.isArray(props[slotKey])) props[slotKey] = [];
  return Effect.succeed(props[slotKey] as ComponentData[]);
};

/** Apply config defaults and initialize declared slot keys to [] if missing. */
const hydrateNewComponent = (
  component: ComponentData,
  config: Config,
): ComponentData => {
  const def = (
    config.components as Record<
      string,
      { defaultProps?: Record<string, unknown> }
    >
  )[component.type];
  const defaults = def?.defaultProps ?? {};
  const givenProps = (component.props ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaults, ...givenProps };
  if (!merged.id || typeof merged.id !== "string") {
    merged.id = generateId(component.type);
  }
  for (const slotKey of slotKeysFromConfig(config, component.type)) {
    if (!Array.isArray(merged[slotKey])) merged[slotKey] = [];
  }
  return { ...component, props: merged } as ComponentData;
};

// ── applyOp ─────────────────────────────────────────────────────────

const applyAdd = (
  data: Data,
  op: Extract<Op, { op: "add" }>,
  config: Config,
): Effect.Effect<Data, OpError> => {
  if (!isKnownComponent(config, op.component.type))
    return Effect.fail(opErr("unknown-component", { type: op.component.type }));
  return resolveTargetArray(data, config, op.parentId, op.slotKey).pipe(
    Effect.flatMap((arr) => {
      const idx = op.index ?? arr.length;
      if (idx < 0 || idx > arr.length)
        return Effect.fail(
          opErr("index-out-of-bounds", {
            index: idx,
            length: arr.length,
          }),
        );
      arr.splice(idx, 0, hydrateNewComponent(op.component, config));
      return Effect.succeed(data);
    }),
  );
};

const applyUpdate = (
  data: Data,
  op: Extract<Op, { op: "update" }>,
  config: Config,
): Effect.Effect<Data, OpError> => {
  const node = findById(data, op.id);
  if (!node) return Effect.fail(opErr("element-not-found", { id: op.id }));
  const def = (
    config.components as Record<
      string,
      { defaultProps?: Record<string, unknown> }
    >
  )[node.type];
  const defaults = def?.defaultProps ?? {};
  const next: Record<string, unknown> = { ...defaults, ...op.props, id: op.id };
  for (const slotKey of slotKeysFromConfig(config, node.type)) {
    const incoming = (op.props as Record<string, unknown>)[slotKey];
    const existing = (node.props as Record<string, unknown>)[slotKey];
    next[slotKey] = Array.isArray(incoming)
      ? incoming
      : Array.isArray(existing)
        ? existing
        : [];
  }
  (node as { props: Record<string, unknown> }).props = next;
  return Effect.succeed(data);
};

const applyRemove = (
  data: Data,
  op: Extract<Op, { op: "remove" }>,
): Effect.Effect<Data, OpError> => {
  const site = findParentSite(data, op.id);
  if (!site) return Effect.fail(opErr("element-not-found", { id: op.id }));
  site.array.splice(site.index, 1);
  return Effect.succeed(data);
};

const applyMove = (
  data: Data,
  op: Extract<Op, { op: "move" }>,
  config: Config,
): Effect.Effect<Data, OpError> => {
  const site = findParentSite(data, op.id);
  if (!site) return Effect.fail(opErr("element-not-found", { id: op.id }));
  const node = site.array[site.index]!;

  if (op.toParentId === op.id)
    return Effect.fail(opErr("circular-move", { id: op.id }));

  if (op.toParentId !== null) {
    const descendants = collectIds(node);
    if (descendants.has(op.toParentId))
      return Effect.fail(
        opErr("circular-move", {
          id: op.id,
          toParentId: op.toParentId,
        }),
      );
  }

  return resolveTargetArray(data, config, op.toParentId, op.toSlotKey).pipe(
    Effect.flatMap((target) => {
      // Detach first so index math is consistent.
      site.array.splice(site.index, 1);
      const sameArray = target === site.array;
      const insertAt =
        sameArray && op.toIndex > site.index ? op.toIndex - 1 : op.toIndex;
      if (insertAt < 0 || insertAt > target.length) {
        // Re-insert at original to leave tree unchanged on failure.
        site.array.splice(site.index, 0, node);
        return Effect.fail(
          opErr("index-out-of-bounds", {
            index: op.toIndex,
            length: target.length,
          }),
        );
      }
      target.splice(insertAt, 0, node);
      return Effect.succeed(data);
    }),
  );
};

export const applyOp = (
  data: Data,
  op: Op,
  config: Config,
): Effect.Effect<Data, OpError> => {
  const clone = structuredClone(data);
  switch (op.op) {
    case "add":
      return applyAdd(clone, op, config);
    case "update":
      return applyUpdate(clone, op, config);
    case "remove":
      return applyRemove(clone, op);
    case "move":
      return applyMove(clone, op, config);
  }
};
