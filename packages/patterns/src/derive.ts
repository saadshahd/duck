import type {
    ArrayField,
    Config,
    Field,
    RadioField,
    SelectField,
} from "@puckeditor/core";
import type { DerivedVariation } from "./types.js";

type Props = Record<string, unknown>;
type FieldMap = Record<string, Field>;
type Choice = { name: string; override: Props };

const toProps = (v: unknown): Props => (v ?? {}) as Props;

function isEnumerable(f: Field): f is SelectField | RadioField {
    return f.type === "select" || f.type === "radio";
}


function fromOptions(key: string, options: SelectField["options"]): Choice[] {
    return options.map((opt) => ({
        name: opt.label,
        override: { [key]: opt.value },
    }));
}

function fromSubFields(
    key: string,
    subFields: FieldMap,
    defaults: Props,
    pack: (merged: Props) => unknown,
): Choice[] {
    return Object.entries(subFields).flatMap(([k, f]) =>
        choices(k, f, defaults[k]).map(({ name, override }) => ({
            name,
            override: { [key]: pack({ ...defaults, ...override }) },
        })),
    );
}

function itemDefaults(field: ArrayField): Props {
    const raw = field.defaultItemProps;
    return toProps(typeof raw === "function" ? raw(0) : raw);
}

function choices(key: string, field: Field, current: unknown): Choice[] {
    if (isEnumerable(field)) return fromOptions(key, field.options);
    if (field.type === "object")
        return fromSubFields(
            key,
            field.objectFields as FieldMap,
            toProps(current),
            (m) => m,
        );
    if (field.type === "array")
        return fromSubFields(
            key,
            field.arrayFields as FieldMap,
            itemDefaults(field),
            (m) => [m],
        );
    return [];
}

export function deriveVariations(
    config: Config,
    componentType: string,
): DerivedVariation[] {
    const component = config.components[componentType];
    if (!component) return [];

    const defaults = toProps(component.defaultProps);

    return Object.entries(component.fields ?? {}).flatMap(([key, field]) =>
        choices(key, field as Field, defaults[key]).map(({ name, override }) => ({
            name,
            componentType,
            props: { ...defaults, ...override },
        })),
    );
}
