import type { Config, Field, SlotField } from "@puckeditor/core";
import type { SlotPath } from "./path.js";

const allTypes = (config: Config): ReadonlySet<string> =>
  new Set(Object.keys(config.components ?? {}));

/** Walk config fields along a slot's prop-path to the field that defines it.
 *  String segments look up a field; array/object fields descend into their
 *  `arrayFields`/`objectFields`; numeric (array-index) segments are skipped. */
const fieldAt = (
  config: Config,
  parentType: string,
  path: SlotPath,
): Field | null => {
  let fields = config.components?.[parentType]?.fields as
    Record<string, Field> | undefined;
  let field: Field | undefined;
  for (const segment of path) {
    if (typeof segment === "number") continue;
    if (!fields) return null;
    field = fields[segment];
    if (!field) return null;
    fields =
      field.type === "array"
        ? (field.arrayFields as Record<string, Field>)
        : field.type === "object"
          ? (field.objectFields as Record<string, Field>)
          : undefined;
  }
  return field ?? null;
};

/**
 * Resolves the set of component types permitted in a slot, reading Puck-native
 * `SlotField.allow`/`disallow` from the catalog Config. The slot is addressed
 * by its prop-path, so array-item and object-nested slots resolve their own
 * constraints.
 *
 * Four-case rule:
 *   bare slot (no allow, no disallow) → all types
 *   allow only → that whitelist
 *   disallow only → all types minus disallowed
 *   both → allow defines the set, disallow subtracts from it
 *
 * Fails closed: missing parent def, missing field, or non-slot field → the empty
 * set. Only a config-declared `slot` field can permit a drop. This guards the
 * phantom-slot case: `slotPathsOf` duck-types an empty non-slot array as a slot,
 * so an empty array-of-primitives prop can surface a slot path that has no slot
 * field — failing closed makes that path permit zero drops (dead, harmless)
 * rather than fabricating a permissive drop target that could corrupt data.
 */
export const allowedTypes = (
  config: Config,
  parentType: string,
  path: SlotPath,
): ReadonlySet<string> => {
  const rawField = fieldAt(config, parentType, path);
  if (!rawField || rawField.type !== "slot") return new Set();
  const field = rawField as SlotField;
  const all = allTypes(config);

  const { allow, disallow } = field;

  if (!allow && !disallow) return all;

  const base: ReadonlySet<string> = allow ? new Set(allow) : all;

  if (!disallow) return base;

  const disallowSet = new Set(disallow);
  return new Set([...base].filter((t) => !disallowSet.has(t)));
};
