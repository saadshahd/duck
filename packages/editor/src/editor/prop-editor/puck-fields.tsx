import { type ReactNode, useState, useEffect } from "react";
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
import { SlotCtx, useSlotCtx, type CrossSlotDrag } from "./slot-context.js";
import { useDebouncedText } from "./use-debounced-text.js";
import { SlotOutline } from "./slot-outline.js";
import { fieldIdentity } from "./field-identity.js";
import {
  fetchExternal,
  externalMapProp,
  initialQuery,
  initialFilters,
  type ExternalQuery,
} from "./external-fetch.js";
import type { ControlId } from "./commit-mode.js";
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

// --- Field renderers ---

const TextInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Extract<Field, { type: "text" }>, unknown>) => {
  const { draft, handleChange, handleBlur, handleKeyDown } = useDebouncedText(
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
        onKeyDown={handleKeyDown}
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
  const { draft, handleChange, handleBlur, handleKeyDown } = useDebouncedText(
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
        onKeyDown={handleKeyDown}
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
}: FieldProps<Extract<Field, { type: "number" }>, unknown>) => {
  const stored = value as number | undefined;
  const { draft, handleChange, handleBlur, handleKeyDown } = useDebouncedText(
    stored === undefined ? "" : String(stored),
    (text) => {
      const parsed = Number(text);
      onChange(text === "" || Number.isNaN(parsed) ? undefined : parsed);
    },
  );
  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
      <input
        type="number"
        value={draft}
        readOnly={readOnly}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

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

type ExternalUnion = Extract<Field, { type: "external" }>;
type ExternalAdaptorField = Extract<ExternalUnion, { adaptor: unknown }>;
type ExternalDirectField = Exclude<ExternalUnion, ExternalAdaptorField>;

const ExternalInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path = "",
  depth = 0,
  isOpen,
  toggle,
}: FieldProps<ExternalUnion, unknown>) => {
  const [items, setItems] = useState<unknown[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => initialQuery(field));
  const [filters, setFilters] = useState<Record<string, unknown>>(() =>
    initialFilters(field),
  );

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: EXTERNAL_MIDDLEWARE,
  });

  const close = () => setOpen(false);
  useOnClickOutside(
    refs.floating as React.RefObject<HTMLElement | null>,
    close,
  );

  const search = (params: ExternalQuery) =>
    fetchExternal(field, params)
      .then(setItems)
      .catch(() => setItems([]));

  const load = () => {
    setOpen(true);
    search({ query, filters });
  };

  const changeFilter = (key: string, v: unknown) => {
    const next = { ...filters, [key]: v };
    setFilters(next);
    search({ query, filters: next });
  };

  const searchDraft = useDebouncedText(query, (q) => {
    setQuery(q);
    search({ query: q, filters });
  });

  // showSearch / filterFields / renderFooter exist only on the direct
  // (non-adaptor) ExternalField variant.
  const direct =
    "adaptor" in field ? undefined : (field as ExternalDirectField);
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
      {open && (
        <div
          ref={refs.setFloating}
          className="prop-field-dropdown"
          data-role="external-dropdown"
          style={floatingStyles}
        >
          {direct?.showSearch && (
            <input
              type="search"
              className="prop-field-dropdown-search"
              data-role="external-search"
              placeholder="Search…"
              value={searchDraft.draft}
              onChange={searchDraft.handleChange}
              onBlur={searchDraft.handleBlur}
              onKeyDown={searchDraft.handleKeyDown}
            />
          )}
          {direct?.filterFields && (
            <div
              className="prop-field-dropdown-filters"
              data-role="external-filters"
            >
              {Object.entries(direct.filterFields).map(([key, filterField]) => (
                <PuckFieldInput
                  key={key}
                  label={key}
                  field={filterField as Field}
                  value={filters[key]}
                  onChange={(v) => changeFilter(key, v)}
                  path={`${path}.filters.${key}`}
                  depth={depth + 1}
                  isOpen={isOpen}
                  toggle={toggle}
                />
              ))}
            </div>
          )}
          {items && (
            <ul className="prop-field-dropdown-list">
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
          {direct?.renderFooter && items && (
            <div
              className="prop-field-dropdown-footer"
              data-role="external-footer"
            >
              {direct.renderFooter({ items })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CustomRender = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path,
}: FieldProps<Extract<Field, { type: "custom" }>, unknown>) => {
  const { parentId } = useSlotCtx();
  const { name, id } = fieldIdentity({ elementId: parentId, path, label });
  return <>{field.render({ field, value, onChange, name, id, readOnly })}</>;
};

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
    // While invalid, the textarea holds the designer's uncommitted draft —
    // syncing here would discard their in-progress JSON on external updates.
    if (invalid) return;
    setText(serialize(value));
  }, [value, invalid]);

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

// Keyed by Extract<Field["type"], ControlId>: adding a renderer for a field type
// without declaring its commit timing in the COMMIT policy is a compile error.
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
  Record<
    Extract<Field["type"], ControlId>,
    (props: FieldProps<never, unknown>) => ReactNode
  >
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
