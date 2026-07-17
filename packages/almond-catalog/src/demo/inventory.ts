/**
 * Inventory model (T13) — the pure data behind the component-inventory demo route.
 *
 * Two guarantees the route depends on:
 *  - `inventoryGroups` lists EVERY registered component. It groups by the catalog's own
 *    `categories`, then appends any component missing from every category under
 *    "Uncategorized" — so a component added to `components` but forgotten in `categories`
 *    surfaces loudly in the route instead of vanishing (the done-bar is "lists every
 *    rostered component").
 *  - `variantFields` names a component's presentational morph axes — the same discrete +
 *    `morphable` filter the editor's quick-variant picker applies (sp-64 §5.1/§5.3),
 *    mirrored here because the catalog cannot import the editor engine (the mirror
 *    `morph-wiring.test.tsx` also keeps). `theme` is excluded: it is the inventory's global
 *    axis, not a per-component strip; content-resolvers (`morphable:false`) and free
 *    text/number/slot fields are not variants.
 *
 * `inventoryDoc` seeds a single-component Puck `Data` doc from the component's own
 * `defaultProps` (nested slot content minted through the page infra's `assignIds`), so the
 * route renders through the real `<Render>` consumer path, not a hand-reconstruction.
 */

import type {
  ComponentConfig,
  Config,
  Data,
  Field,
  Fields,
} from "@puckeditor/core";
import { assignIds } from "../pages/page";
import type { ThemeName } from "../tokens/themes";

export interface InventoryGroup {
  title: string;
  types: string[];
}

export function inventoryGroups(config: Config): InventoryGroup[] {
  const categories = Object.values(config.categories ?? {});
  const groups = categories.map((category) => ({
    title: category?.title ?? "Components",
    types: [...(category?.components ?? [])] as string[],
  }));
  const categorized = new Set(groups.flatMap((group) => group.types));
  const orphans = Object.keys(config.components).filter(
    (type) => !categorized.has(type),
  );
  return orphans.length
    ? [...groups, { title: "Uncategorized", types: orphans }]
    : groups;
}

export interface VariantOption {
  label: string;
  value: unknown;
}

export interface VariantField {
  key: string;
  options: VariantOption[];
}

/** A presentational variant axis: a discrete choice (2–6 options) the morph picker would
 *  offer — `morphable` and not the global `theme` axis. */
export function variantFields(comp: ComponentConfig<any>): VariantField[] {
  const fields = (comp.fields ?? {}) as Fields;
  return Object.entries(fields).flatMap(([key, field]) => {
    // Puck's Field union is generically invariant (ArrayField<never>) so its members must
    // be widened to read options/metadata — the same bridge morph-wiring.test.tsx uses.
    const f = field as Field & {
      options?: VariantOption[];
      metadata?: { morphable?: unknown };
    };
    if (key === "theme") return [];
    if (f.type !== "radio" && f.type !== "select") return [];
    if (f.metadata?.morphable === false) return [];
    const options = f.options ?? [];
    if (options.length < 2 || options.length > 6) return [];
    return [{ key, options }];
  });
}

/** Seed a one-component document from the component's defaults, overriding a variant field
 *  and injecting the selected theme where the component declares a `theme` field. */
export function inventoryDoc(input: {
  config: Config;
  type: string;
  theme: ThemeName;
  prefix: string;
  override?: Record<string, unknown>;
}): Data {
  const { config, type, theme, prefix, override } = input;
  const comp = config.components[type];
  const defaults = (comp.defaultProps ?? {}) as Record<string, unknown>;
  const themed = "theme" in (comp.fields ?? {});
  const props = {
    ...defaults,
    ...(themed ? { theme } : {}),
    ...override,
  };
  return { root: {}, content: assignIds([{ type, props }], prefix) };
}
