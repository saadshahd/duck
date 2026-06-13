import { type ReactNode, useState, useEffect, useRef } from "react";
import type { Config, Data, Field } from "@puckeditor/core";
import { useFloating, flip, shift } from "@floating-ui/react";
import { Disclosure } from "./disclosure.js";
import { grouped } from "./grouping.js";
import { useDisclosureState } from "./use-disclosure-state.js";
import { controlRenderers } from "./controls/index.js";
import { resolveRenderer } from "./controls/dispatch.js";
import { FieldLabel, fieldClass, selectDisplay } from "./field-shell.js";
import { FieldMetadata } from "./field-metadata.js";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import css from "./object-section.css?inline";
import { SlotCtx, type CrossSlotDrag } from "./slot-context.js";
import { SlotOutline } from "./slot-outline.js";
import type { EditorCommit } from "../types.js";

const EXTERNAL_MIDDLEWARE = [flip(), shift({ padding: 8 })];

export type { ValueMode } from "./field-shell.js";
export { resolveValueMode } from "./field-shell.js";

// --- Label formatting ---

const camelToTitle = (key: string): string =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const toDisplayLabel = (key: string, override?: string): string =>
  override ?? camelToTitle(key);

// --- Always-open section with heading ---

function FieldSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}): ReactNode {
  useShadowSheet(css);
  return (
    <section className="field-section">
      <h3 className="field-section-heading">{heading}</h3>
      {children}
    </section>
  );
}

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

// --- Debounced text hook ---

const DEBOUNCE_MS = 500;

function useDebouncedText(
  value: string,
  onChange: (v: string) => void,
): {
  draft: string;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleBlur: () => void;
} {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);

  // Sync incoming value when element selection changes (remount via key)
  useEffect(() => {
    setDraft(value);
    draftRef.current = value;
  }, [value]);

  const flush = (text: string) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onChange(text);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const text = e.target.value;
    setDraft(text);
    draftRef.current = text;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onChange(draftRef.current);
    }, DEBOUNCE_MS);
  };

  const handleBlur = () => flush(draftRef.current);

  // Flush on unmount so no pending timer fires against stale parent state
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  return { draft, handleChange, handleBlur };
}

// --- Field renderers ---

const TextInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "text" }>, unknown>) => {
  const { draft, handleChange, handleBlur } = useDebouncedText(
    (value as string) ?? "",
    onChange as (v: string) => void,
  );
  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
      <input
        type="text"
        value={draft}
        readOnly={readOnly}
        placeholder={field.placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
};

const TextareaInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "textarea" }>, unknown>) => {
  const { draft, handleChange, handleBlur } = useDebouncedText(
    (value as string) ?? "",
    onChange as (v: string) => void,
  );
  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
      <textarea
        value={draft}
        readOnly={readOnly}
        placeholder={field.placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={3}
      />
    </div>
  );
};

const NumberInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "number" }>, unknown>) => (
  <div className={fieldClass(readOnly)}>
    <FieldLabel text={toDisplayLabel(label, field.label)} readOnly={readOnly} />
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
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
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
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
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
  const heading = FieldMetadata.group(field) ?? field.label ?? label;
  return (
    <FieldSection heading={heading}>
      {Object.entries(field.objectFields).map(([key, childField]) => (
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
    </FieldSection>
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
    <FieldLabel text={toDisplayLabel(label, field.label)} />
    <p className="prop-sheet-hint">
      Select a child element on the canvas, or use Insert + to add one.
    </p>
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

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: EXTERNAL_MIDDLEWARE,
  });

  const close = () => setOpen(false);
  useOnClickOutside(
    refs.floating as React.RefObject<HTMLElement | null>,
    close,
  );

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
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
      <button
        ref={refs.setReference}
        type="button"
        disabled={readOnly}
        onClick={load}
      >
        {value ? summarize(value as never) : (field.placeholder ?? "Select...")}
      </button>
      {open && items && (
        <ul
          ref={refs.setFloating}
          className="prop-field-dropdown"
          style={floatingStyles}
        >
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
      <FieldLabel text={toDisplayLabel(label, field.label)} />
      <p className="prop-sheet-hint prop-sheet-hint--warning">
        Unsupported field type: {field.type}. No control is registered for this
        type.
      </p>
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
  slot: SlotOutline,
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

type RenderItem =
  | { kind: "field"; key: string; field: Field }
  | { kind: "group"; label: string; entries: [string, Field][] };

/** Collapse same-group top-level fields into shared section items.
 *  Fields without a group metadata value remain as standalone items.
 *  Ordering follows the bin order from `grouped()` (primary → disclosed → slot). */
const toRenderItems = (fields: Record<string, Field>): RenderItem[] => {
  const seen = new Map<string, RenderItem & { kind: "group" }>();
  return grouped(fields).reduce<RenderItem[]>((acc, [key, field]) => {
    const grp = FieldMetadata.group(field);
    if (!grp) {
      acc.push({ kind: "field", key, field });
      return acc;
    }
    const existing = seen.get(grp);
    if (existing) {
      existing.entries.push([key, field]);
      return acc;
    }
    const item: RenderItem & { kind: "group" } = {
      kind: "group",
      label: grp,
      entries: [[key, field]],
    };
    seen.set(grp, item);
    acc.push(item);
    return acc;
  }, []);
};

/** Render all top-level fields for a component, grouped primary → disclosed → slot.
 *  Fields sharing the same metadata.group are clustered under a shared section heading. */
export function PuckFields({
  fields,
  values,
  readOnlyFields,
  onChange,
  elementId,
  data,
  config,
  commit,
}: {
  fields: Record<string, Field>;
  values: Record<string, unknown>;
  readOnlyFields?: Partial<Record<string, boolean>>;
  onChange: (key: string, value: unknown) => void;
  elementId: string;
  data: Data;
  config: Config;
  commit: EditorCommit;
}): ReactNode {
  const { isOpen, toggle } = useDisclosureState(elementId);
  const [crossDrag, setCrossDrag] = useState<CrossSlotDrag>(undefined);
  return (
    <SlotCtx.Provider
      value={{
        data,
        config,
        commit,
        parentId: elementId,
        crossDrag,
        setCrossDrag,
      }}
    >
      {toRenderItems(fields).map((item) => {
        if (item.kind === "field") {
          return (
            <PuckFieldInput
              key={item.key}
              label={item.key}
              field={item.field}
              value={values[item.key]}
              readOnly={readOnlyFields?.[item.key]}
              onChange={(v) => onChange(item.key, v)}
              path={item.key}
              depth={0}
              isOpen={isOpen}
              toggle={toggle}
            />
          );
        }
        return (
          <FieldSection key={item.label} heading={item.label}>
            {item.entries.map(([key, field]) => (
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
          </FieldSection>
        );
      })}
    </SlotCtx.Provider>
  );
}
