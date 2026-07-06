import type {
  ComponentData,
  Config,
  Field,
  RadioField,
  SelectField,
} from "@puckeditor/core";
import type { DerivedVariation } from "@duckeditor/spec";

/** Discrete-choice ceiling. Fields with more options read as value pickers
 *  (dimension scales, palettes) — enumerating them floods the picker. */
const MAX_OPTIONS = 6;

type FieldMap = Record<string, Field>;

const fieldsOf = (config: Config, type: string): FieldMap =>
  (config.components[type]?.fields ?? {}) as FieldMap;

const isDiscreteChoice = (field?: Field): field is SelectField | RadioField =>
  !!field &&
  (field.type === "select" || field.type === "radio") &&
  field.options.length <= MAX_OPTIONS;

const targetsDiscreteFields = (
  fields: FieldMap,
  variation: DerivedVariation,
): boolean =>
  Object.keys(variation.props).every((key) => isDiscreteChoice(fields[key]));

const matchesCurrent = (
  element: ComponentData,
  variation: DerivedVariation,
): boolean =>
  Object.entries(variation.props).every(
    ([key, value]) => element.props[key] === value,
  );

/** Field-option alternatives worth offering for `element`: variations that
 *  flip a top-level select/radio knob, minus the one already applied. */
export const quickVariants = ({
  variations,
  config,
  element,
}: {
  variations: DerivedVariation[];
  config: Config;
  element: ComponentData;
}): DerivedVariation[] => {
  const fields = fieldsOf(config, element.type);
  return variations
    .filter((v) => targetsDiscreteFields(fields, v))
    .filter((v) => !matchesCurrent(element, v));
};

/** The element as it would look with the variation's prop overrides applied.
 *  Current props are preserved; only the varied field changes. */
export const withVariant = (
  element: ComponentData,
  variation: DerivedVariation,
): ComponentData => ({
  ...element,
  props: { ...element.props, ...variation.props },
});
