import type { Config } from "@puckeditor/core";
import type { DerivedVariation } from "./types.js";

const LAYOUT_KEYS = [
  "direction",
  "columns",
  "align",
  "gap",
  "variant",
  "layout",
] as const;

// substring match — intentionally catches compound prop names (e.g. flexDirection, columnGap)
function isLayoutKey(key: string): boolean {
  return LAYOUT_KEYS.some((k) => key.includes(k));
}

export function deriveVariations(
  puckConfig: Config,
  componentType: string,
): DerivedVariation[] {
  const component = puckConfig.components[componentType];
  if (!component) return [];

  const fields = component.fields ?? {};
  const defaultProps = (component.defaultProps ?? {}) as Record<
    string,
    unknown
  >;

  return Object.entries(fields).flatMap(([key, field]) => {
    if (field.type !== "select" && field.type !== "radio") return [];
    if (!isLayoutKey(key)) return [];

    return field.options.map((option) => ({
      name: option.label,
      componentType,
      props: { ...defaultProps, [key]: option.value },
    }));
  });
}
