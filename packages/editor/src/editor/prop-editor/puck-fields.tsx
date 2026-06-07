import { type ReactNode, useState, useEffect } from "react";
import type { Field } from "@puckeditor/core";
import { Disclosure } from "./disclosure.js";
import { grouped } from "./grouping.js";
import { useDisclosureState } from "./use-disclosure-state.js";
import { controlRenderers } from "./controls/index.js";
import { resolveRenderer } from "./controls/dispatch.js";
import { FieldLabel, fieldClass, selectDisplay } from "./field-shell.js";

// --- Controlled field props (decoupled from form library) ---

export type FieldProps<F extends Field = Field, V = unknown> = {
  label: string;
  field: F;
  value: V;
  onChange: (value: V) => void;
  readOnly?: boolean;
  path?: string;
  depth?: number;
  isOpen?: (p: string) => boolean;
  toggle?: (p: string) => void;
};

// --- Field renderers ---

const TextInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "text" }>, unknown>) => (
  <div className={fieldClass(readOnly)}>
    <FieldLabel text={field.label ?? label} readOnly={readOnly} />
    <input
      type="text"
      value={(value as string) ?? ""}
      readOnly={readOnly}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const TextareaInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "textarea" }>, unknown>) => (
  <div className={fieldClass(readOnly)}>
    <FieldLabel text={field.label ?? label} readOnly={readOnly} />
    <textarea
      value={(value as string) ?? ""}
      readOnly={readOnly}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
    />
  </div>
);

const NumberInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "number" }>, unknown>) => (
  <div className={fieldClass(readOnly)}>
    <FieldLabel text={field.label ?? label} readOnly={readOnly} />
    <input
      type="number"
      value={(value as number) ?? ""}
      readOnly={readOnly}
      min={field.min}
      max={field.max}
      step={field.step}
      placeholder={field.placeholder}
      onChange={(e) =>
        onChange(e.target.value === "" ? undefined : Number(e.target.value))
      }
    />
  </div>
);

const SelectInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "select" }>, unknown>) => {
  const { isUnset, display } = selectDisplay(value, field.options);
  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel text={field.label ?? label} readOnly={readOnly} />
      <select
        value={display}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
      >
        {isUnset && (
          <option value="" disabled hidden>
            — Select —
          </option>
        )}
        {field.options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const RadioInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "radio" }>, unknown>) => {
  const disabled = readOnly;
  const groupName = `radio-${label}`;
  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel text={field.label ?? label} readOnly={readOnly} />
      {field.options.map((opt) => (
        <label key={String(opt.value)}>
          <input
            type="radio"
            name={groupName}
            value={String(opt.value)}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
};

const ObjectInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path = "",
  depth = 0,
  isOpen,
  toggle,
}: FieldProps<Extract<Field, { type: "object" }>, unknown>) => {
  const obj = (value ?? {}) as Record<string, unknown>;
  const open = isOpen?.(path) ?? false;
  const entries = Object.entries(field.objectFields);
  return (
    <Disclosure.Root>
      <Disclosure.Trigger
        label={field.label ?? label}
        count={entries.length}
        open={open}
        onToggle={() => toggle?.(path)}
      />
      {open && (
        <Disclosure.Panel depth={depth + 1}>
          {entries.map(([key, childField]) => (
            <PuckFieldInput
              key={key}
              label={key}
              field={childField as Field}
              value={obj[key]}
              onChange={(v) => onChange({ ...obj, [key]: v })}
              readOnly={readOnly}
              path={`${path}.${key}`}
              depth={depth + 1}
              isOpen={isOpen}
              toggle={toggle}
            />
          ))}
        </Disclosure.Panel>
      )}
    </Disclosure.Root>
  );
};

const ArrayInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path = "",
  depth = 0,
  isOpen,
  toggle,
}: FieldProps<Extract<Field, { type: "array" }>, unknown>) => {
  const items = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];
  const summarize = field.getItemSummary;
  const open = isOpen?.(path) ?? false;
  return (
    <Disclosure.Root>
      <Disclosure.Trigger
        label={field.label ?? label}
        count={items.length}
        open={open}
        onToggle={() => toggle?.(path)}
      />
      {open && (
        <Disclosure.Panel depth={depth + 1}>
          {items.map((item, i) => {
            const itemPath = `${path}.${i}`;
            const itemOpen = isOpen?.(itemPath) ?? false;
            return (
              <Disclosure.Root key={i}>
                <Disclosure.Trigger
                  label={summarize ? summarize(item, i) : `Item ${i + 1}`}
                  open={itemOpen}
                  onToggle={() => toggle?.(itemPath)}
                />
                {itemOpen && (
                  <Disclosure.Panel depth={depth + 2}>
                    {Object.entries(field.arrayFields).map(
                      ([key, childField]) => (
                        <PuckFieldInput
                          key={key}
                          label={key}
                          field={childField as Field}
                          value={item[key]}
                          onChange={(v) => {
                            const next = items.slice();
                            next[i] = { ...item, [key]: v };
                            onChange(next);
                          }}
                          readOnly={readOnly}
                          path={`${itemPath}.${key}`}
                          depth={depth + 2}
                          isOpen={isOpen}
                          toggle={toggle}
                        />
                      ),
                    )}
                  </Disclosure.Panel>
                )}
              </Disclosure.Root>
            );
          })}
        </Disclosure.Panel>
      )}
    </Disclosure.Root>
  );
};

const SlotHint = ({
  label,
  field,
}: FieldProps<Extract<Field, { type: "slot" }>, unknown>) => (
  <div className="prop-field">
    <FieldLabel text={field.label ?? label} />
    <p className="prop-sheet-hint">Manage children in canvas.</p>
  </div>
);

type ExternalUnion = Extract<Field, { type: "external" }>;
type ExternalAdaptorField = Extract<ExternalUnion, { adaptor: unknown }>;
type ExternalDirectField = Exclude<ExternalUnion, ExternalAdaptorField>;

const fetchExternal = (field: ExternalUnion): Promise<unknown[]> => {
  if ("adaptor" in field) {
    const adaptor = (field as ExternalAdaptorField).adaptor;
    return adaptor
      .fetchList((field as ExternalAdaptorField).adaptorParams)
      .then((rows: unknown[] | null) => rows ?? []);
  }
  const direct = field as ExternalDirectField;
  return direct
    .fetchList({ query: direct.initialQuery ?? "", filters: {} })
    .then((rows: unknown[] | null) => rows ?? []);
};

const externalMapProp = (field: ExternalUnion): ((item: unknown) => unknown) =>
  "adaptor" in field
    ? ((field as ExternalAdaptorField).adaptor.mapProp ?? ((item) => item))
    : ((field as ExternalDirectField).mapProp ?? ((item) => item));

const ExternalInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<ExternalUnion, unknown>) => {
  const [items, setItems] = useState<unknown[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    setOpen(true);
    fetchExternal(field)
      .then(setItems)
      .catch(() => setItems([]));
  };

  const summarize = field.getItemSummary ?? ((item: unknown) => String(item));
  const mapProp = externalMapProp(field);

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel text={field.label ?? label} readOnly={readOnly} />
      <button type="button" disabled={readOnly} onClick={load}>
        {value ? summarize(value as never) : (field.placeholder ?? "Select...")}
      </button>
      {open && items && (
        <ul className="prop-field-nested">
          {items.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onChange(mapProp(item));
                  setOpen(false);
                }}
              >
                {summarize(item as never)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CustomRender = ({
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "custom" }>, unknown>) => (
  <>
    {field.render({
      field,
      value,
      onChange,
      name: "",
      id: "",
      readOnly,
    })}
  </>
);

const FallbackField = ({
  label,
  field,
  value,
  onChange,
}: FieldProps<Field, unknown>) => {
  const serialize = (v: unknown): string =>
    typeof v === "string" ? v : (JSON.stringify(v, null, 2) ?? "");

  const [text, setText] = useState(() => serialize(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(serialize(value));
    setInvalid(false);
  }, [value]);

  return (
    <div className="prop-field">
      <FieldLabel text={field.label ?? label} />
      <textarea
        value={text}
        data-invalid={invalid || undefined}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          try {
            onChange(JSON.parse(raw));
            setInvalid(false);
          } catch {
            setInvalid(true);
          }
        }}
        rows={3}
      />
    </div>
  );
};

// --- Type → renderer dispatch ---

const renderers = {
  text: TextInput,
  textarea: TextareaInput,
  number: NumberInput,
  select: SelectInput,
  radio: RadioInput,
  object: ObjectInput,
  array: ArrayInput,
  slot: SlotHint,
  external: ExternalInput,
  custom: CustomRender,
} as const satisfies Partial<
  Record<Field["type"], (props: FieldProps<never, unknown>) => ReactNode>
>;

/** Render a single Puck field with the appropriate input.
 *  Priority: metadata.control (if registered) → field.type renderer → FallbackField. */
function PuckFieldInput(props: FieldProps): ReactNode {
  const Renderer = resolveRenderer(
    props as FieldProps<Field, unknown>,
    controlRenderers,
    renderers as Record<string, (p: FieldProps<Field, unknown>) => ReactNode>,
  );
  if (Renderer) return Renderer(props as FieldProps<never, unknown>);
  return <FallbackField {...props} />;
}

/** Render all top-level fields for a component, grouped primary → disclosed → slot. */
export function PuckFields({
  fields,
  values,
  readOnlyFields,
  onChange,
  elementId,
}: {
  fields: Record<string, Field>;
  values: Record<string, unknown>;
  readOnlyFields?: Partial<Record<string, boolean>>;
  onChange: (key: string, value: unknown) => void;
  elementId: string;
}): ReactNode {
  const { isOpen, toggle } = useDisclosureState(elementId);
  return (
    <>
      {grouped(fields).map(([key, field]) => (
        <PuckFieldInput
          key={key}
          label={key}
          field={field}
          value={values[key]}
          readOnly={readOnlyFields?.[key]}
          onChange={(v) => onChange(key, v)}
          path={key}
          depth={0}
          isOpen={isOpen}
          toggle={toggle}
        />
      ))}
    </>
  );
}
