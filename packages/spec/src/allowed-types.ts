import type { Config, SlotField } from "@puckeditor/core";

const allTypes = (config: Config): ReadonlySet<string> =>
  new Set(Object.keys(config.components ?? {}));

/**
 * Resolves the set of component types permitted in a slot, reading Puck-native
 * `SlotField.allow`/`disallow` from the catalog Config.
 *
 * Four-case rule:
 *   bare slot (no allow, no disallow) → all types
 *   allow only → that whitelist
 *   disallow only → all types minus disallowed
 *   both → allow defines the set, disallow subtracts from it
 *
 * Fails open: missing parent def, missing field, or non-slot field → all types.
 */
export const allowedTypes = (
  config: Config,
  parentType: string,
  slotKey: string,
): ReadonlySet<string> => {
  const all = allTypes(config);
  const rawField = config.components?.[parentType]?.fields?.[slotKey];
  if (!rawField || rawField.type !== "slot") return all;
  const field = rawField as SlotField;

  const { allow, disallow } = field;

  if (!allow && !disallow) return all;

  const base: ReadonlySet<string> = allow ? new Set(allow) : all;

  if (!disallow) return base;

  const disallowSet = new Set(disallow);
  return new Set([...base].filter((t) => !disallowSet.has(t)));
};
