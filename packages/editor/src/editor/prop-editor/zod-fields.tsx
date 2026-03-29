import type { ReactNode } from "react";
import type { ZodTypeAny } from "zod";
import {
  isString,
  isEnum,
  isNumber,
  isBoolean,
  isObject,
  isRecord,
  isOptional,
  enumValues,
  shapeEntries,
} from "./zod-inspect.js";

// --- Controlled field props (decoupled from form library) ---

type FieldProps = {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
};

type SchemaFieldProps = FieldProps & { schema: ZodTypeAny };

// --- Field renderers ---

const StringInput = ({ label, value, onChange }: FieldProps) => (
  <div>
    <label>{label}</label>
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const NumberInput = ({ label, value, onChange }: FieldProps) => (
  <div>
    <label>{label}</label>
    <input
      type="number"
      value={(value as number) ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

const BooleanToggle = ({ label, value, onChange }: FieldProps) => (
  <div>
    <label>
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  </div>
);

const EnumSelect = ({ label, value, onChange, schema }: SchemaFieldProps) => (
  <div>
    <label>{label}</label>
    <select
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {isOptional(schema) && <option value="">—</option>}
      {enumValues(schema).map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  </div>
);

const ObjectFields = ({ label, value, onChange, schema }: SchemaFieldProps) => {
  const entries = shapeEntries(schema);
  if (entries.length === 0) return null;

  const obj = (value ?? {}) as Record<string, unknown>;
  return (
    <details>
      <summary>{label}</summary>
      <div className="prop-popover-nested">
        {entries.map(([key, childSchema]) => (
          <ZodField
            key={key}
            label={key}
            schema={childSchema}
            value={obj[key]}
            onChange={(v) => onChange({ ...obj, [key]: v })}
          />
        ))}
      </div>
    </details>
  );
};

const FallbackField = ({ label, value, onChange }: FieldProps) => (
  <div>
    <label>{label}</label>
    <textarea
      value={
        typeof value === "string"
          ? value
          : (JSON.stringify(value, null, 2) ?? "")
      }
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          onChange(e.target.value);
        }
      }}
      rows={3}
    />
  </div>
);

// --- Type → renderer lookup ---

const resolveRenderer = (
  schema: ZodTypeAny,
): ((props: SchemaFieldProps) => ReactNode) => {
  if (isString(schema)) return StringInput;
  if (isEnum(schema)) return EnumSelect;
  if (isNumber(schema)) return NumberInput;
  if (isBoolean(schema)) return BooleanToggle;
  if (isObject(schema)) return ObjectFields;
  if (isRecord(schema)) return FallbackField;
  return FallbackField;
};

/** Render a single field with the appropriate input for its Zod type. */
export function ZodField(props: SchemaFieldProps): ReactNode {
  return resolveRenderer(props.schema)(props);
}

/** Render all fields from a ZodObject schema. */
export function ZodFields({
  schema,
  values,
  onChange,
}: {
  schema: ZodTypeAny;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}): ReactNode {
  return (
    <>
      {shapeEntries(schema).map(([key, fieldSchema]) => (
        <ZodField
          key={key}
          label={key}
          schema={fieldSchema}
          value={values[key]}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </>
  );
}
