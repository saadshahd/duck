import type { ComponentData, Data } from "@puckeditor/core";
import { Effect } from "effect";
import {
  buildParentMap,
  getAncestry,
  preOrder,
  slotKeysOf,
} from "@json-render-editor/spec";

type Match = {
  readonly id: string;
  readonly type: string;
  readonly propPath: string;
  readonly value: string;
  readonly ancestry: ReturnType<typeof getAncestry>;
};

const matchesIn = (
  component: ComponentData,
  query: string,
): Array<{ propPath: string; value: string }> => {
  const skip = new Set(slotKeysOf(component));
  const out: Array<{ propPath: string; value: string }> = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") {
      if (value.toLowerCase().includes(query))
        out.push({ propPath: path, value });
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      const text = String(value);
      if (text.toLowerCase().includes(query))
        out.push({ propPath: path, value: text });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  for (const [key, value] of Object.entries(component.props ?? {})) {
    if (skip.has(key)) continue;
    walk(value, key);
  }
  return out;
};

export const search = (data: Data, q: string) => {
  const lower = q.toLowerCase();
  const parentMap = buildParentMap(data);
  const results: Match[] = [];
  for (const { component } of preOrder(data)) {
    const id = (component.props as { id?: string })?.id;
    if (!id) continue;
    for (const m of matchesIn(component, lower)) {
      results.push({
        id,
        type: component.type,
        propPath: m.propPath,
        value: m.value,
        ancestry: getAncestry(parentMap, id),
      });
    }
  }
  return Effect.succeed({ results, count: results.length });
};
