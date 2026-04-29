import { type ReactNode, useState, useEffect, useContext } from "react";
import {
  Select,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  RadioGroup,
  Radio,
  Label,
} from "react-aria-components";
import type { Field } from "@puckeditor/core";
import { PortalContext } from "../overlay/index.js";

// --- Controlled field props (decoupled from form library) ---

type FieldProps<F extends Field = Field, V = unknown> = {
  label: string;
  field: F;
  value: V;
  onChange: (value: V) => void;
  readOnly?: boolean;
};

// --- Field renderers ---

const TextInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "text" }>, unknown>) => (
  <div>
    <label>{field.label ?? label}</label>
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
  <div>
    <label>{field.label ?? label}</label>
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
  <div>
    <label>{field.label ?? label}</label>
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
  const portalContainer = useContext(PortalContext);
  return (
    <div>
      <label>{field.label ?? label}</label>
      <Select
        isDisabled={readOnly}
        selectedKey={String(value ?? "")}
        onSelectionChange={(key) => {
          const opt = field.options.find(
            (o) => String(o.value) === String(key),
          );
          onChange(opt ? opt.value : key);
        }}
        className="prop-select"
      >
        <Button className="prop-select-btn">
          <SelectValue />
          <span aria-hidden className="prop-select-chevron">
            ▾
          </span>
        </Button>
        <Popover
          className="prop-select-popover"
          UNSTABLE_portalContainer={portalContainer ?? undefined}
        >
          <ListBox className="prop-select-list">
            {field.options.map((opt) => (
              <ListBoxItem
                key={String(opt.value)}
                id={String(opt.value)}
                className="prop-select-option"
              >
                {opt.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
};

const RadioInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "radio" }>, unknown>) => (
  <RadioGroup
    isDisabled={readOnly}
    value={String(value ?? "")}
    onChange={(val) => {
      const opt = field.options.find((o) => String(o.value) === val);
      onChange(opt ? opt.value : val);
    }}
    className="prop-radio-group"
  >
    <Label className="prop-radio-legend">{field.label ?? label}</Label>
    {field.options.map((opt) => (
      <Radio
        key={String(opt.value)}
        value={String(opt.value)}
        className="prop-radio"
      >
        {opt.label}
      </Radio>
    ))}
  </RadioGroup>
);

const ObjectInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "object" }>, unknown>) => {
  const obj = (value ?? {}) as Record<string, unknown>;
  return (
    <details>
      <summary>{field.label ?? label}</summary>
      <div className="prop-popover-nested">
        {Object.entries(field.objectFields).map(([key, childField]) => (
          <PuckFieldInput
            key={key}
            label={key}
            field={childField as Field}
            value={obj[key]}
            onChange={(v) => onChange({ ...obj, [key]: v })}
            readOnly={readOnly}
          />
        ))}
      </div>
    </details>
  );
};

const ArrayInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "array" }>, unknown>) => {
  const items = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];
  const summarize = field.getItemSummary;
  return (
    <details>
      <summary>{field.label ?? label}</summary>
      <div className="prop-popover-nested">
        {items.map((item, i) => (
          <details key={i}>
            <summary>
              {summarize ? summarize(item, i) : `Item ${i + 1}`}
            </summary>
            <div className="prop-popover-nested">
              {Object.entries(field.arrayFields).map(([key, childField]) => (
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
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
};

const SlotHint = ({
  label,
  field,
}: FieldProps<Extract<Field, { type: "slot" }>, unknown>) => (
  <div>
    <label>{field.label ?? label}</label>
    <p className="prop-popover-hint">Manage children in canvas.</p>
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
    <div>
      <label>{field.label ?? label}</label>
      <button type="button" disabled={readOnly} onClick={load}>
        {value ? summarize(value as never) : (field.placeholder ?? "Select...")}
      </button>
      {open && items && (
        <ul className="prop-popover-nested">
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
    <div>
      <label>{field.label ?? label}</label>
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

/** Render a single Puck field with the appropriate input. */
function PuckFieldInput(props: FieldProps): ReactNode {
  const Renderer = (renderers as Record<string, unknown>)[props.field.type] as
    | ((p: FieldProps<never, unknown>) => ReactNode)
    | undefined;
  if (Renderer) return Renderer(props as FieldProps<never, unknown>);
  return <FallbackField {...props} />;
}

/** Render all top-level fields for a component. */
export function PuckFields({
  fields,
  values,
  readOnlyFields,
  onChange,
}: {
  fields: Record<string, Field>;
  values: Record<string, unknown>;
  readOnlyFields?: Partial<Record<string, boolean>>;
  onChange: (key: string, value: unknown) => void;
}): ReactNode {
  return (
    <>
      {Object.entries(fields).map(([key, field]) => (
        <PuckFieldInput
          key={key}
          label={key}
          field={field}
          value={values[key]}
          readOnly={readOnlyFields?.[key]}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </>
  );
}
