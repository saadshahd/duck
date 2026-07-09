import { type ReactNode, useState, useEffect } from "react";
import { Result } from "neverthrow";
import type { Config, Data, Field } from "@puckeditor/core";
import type { SlotPath } from "@duckeditor/spec";
import { useFloating, flip, shift } from "@floating-ui/react";
import { Disclosure } from "./disclosure.js";
import { grouped } from "./grouping.js";
import { useDisclosureState } from "./use-disclosure-state.js";
import { controlRenderers } from "./controls/index.js";
import { resolveRenderer } from "./controls/dispatch.js";
import { FieldLabel, fieldClass, selectDisplay } from "./field-shell.js";
import { toDisplayLabel } from "./field-label.js";
import { FieldMetadata } from "./field-metadata.js";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import css from "./object-section.css?inline";
import arraySlotSummaryCss from "./array-slot-summary.css?inline";
import { SlotCtx, useSlotCtx, type CrossSlotDrag } from "./slot-context.js";
import { useDebouncedText } from "./use-debounced-text.js";
import { SlotOutline } from "./slot-outline.js";
import { RadioInput } from "./radio.js";
import { ArrayItems, type ArrayItem, type ArrayOp } from "./array-items.js";
import { ArrayControl } from "./array-control.js";
import { useItemKeys } from "./use-item-keys.js";
import { useReorderFocus } from "./use-reorder-focus.js";
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

/** Commit annotation a control may pass with a value change. Structural array
 *  ops (add/remove/reorder) carry their own history label and opt out of the
 *  per-element coalescing group so each op lands as one history entry. */
export type ChangeMeta = { label: string; coalesce: false };

export type FieldProps<F extends Field = Field, V = unknown> = {
  label: string;
  field: F;
  value: V;
  onChange: (value: V, meta?: ChangeMeta) => void;
  readOnly?: boolean;
  path?: string;
  /** The field's prop-path from the edited component's root (real prop keys and
   *  array indices), distinct from `path` (the disclosure-state string key).
   *  Addresses an array-item slot for the canvas-jump. */
  propPath?: SlotPath;
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

const ObjectInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path = "",
  propPath = [],
  depth = 0,
  isOpen,
  toggle,
}: FieldProps<Extract<Field, { type: "object" }>, unknown>) => {
  const obj = (value ?? {}) as Record<string, unknown>;
  const heading =
    FieldMetadata.group(field) ?? toDisplayLabel(label, field.label);
  const fields = Object.entries(field.objectFields).map(([key, childField]) => (
    <PuckFieldInput
      key={key}
      label={key}
      field={childField as Field}
      value={obj[key]}
      onChange={(v, meta) => onChange({ ...obj, [key]: v }, meta)}
      readOnly={readOnly}
      path={`${path}.${key}`}
      propPath={[...propPath, key]}
      depth={depth + 1}
      isOpen={isOpen}
      toggle={toggle}
    />
  ));

  // Top-level object → an always-open uppercase section landmark (the sheet's
  // one grouping edge). A nested object (inside another object) → a caret
  // disclosure indented one gutter, so depth stays legible without a tall,
  // fully-expanded sheet. One indent step per level — the section itself never
  // indents, so a nested group never double-indents.
  if (depth === 0)
    return <FieldSection heading={heading}>{fields}</FieldSection>;

  const open = isOpen?.(path) ?? false;
  return (
    <div className="object-nested">
      <Disclosure.Trigger
        label={heading}
        open={open}
        onToggle={() => toggle?.(path)}
      />
      {open && <div className="object-nested-fields">{fields}</div>}
    </div>
  );
};

/** Read-only canvas-jump summary for a slot nested in an array item. Honest:
 *  the count reflects the item's ACTUAL stored children; the row is read-only
 *  (never an editable in-sheet outline) and jumps to the canvas to edit. */
const ArraySlotSummary = ({
  label,
  field,
  value,
  path,
}: {
  label: string;
  field: Extract<Field, { type: "slot" }>;
  value: unknown;
  path: SlotPath;
}): ReactNode => {
  useShadowSheet(arraySlotSummaryCss);
  const { selectSlot } = useSlotCtx();
  const count = Array.isArray(value) ? value.length : 0;
  return (
    <div className={`${fieldClass(true)} array-slot-summary`}>
      <FieldLabel text={toDisplayLabel(label, field.label)} readOnly />
      <button
        type="button"
        className="array-slot-summary-jump"
        data-role="array-slot-summary"
        onClick={() => selectSlot(path)}
      >
        <span className="array-slot-summary-count" data-role="array-slot-count">
          {count} {count === 1 ? "item" : "items"}
        </span>
        <span className="array-slot-summary-edit">Edit on canvas ›</span>
      </button>
    </div>
  );
};

/** Array-item sub-field types that render as a canvas-jump instead of a
 *  sheet-local control. A slot is the only one: its children are edited on the
 *  canvas so the sheet never hosts a second, occluding control surface. */
const arrayItemRenderers = {
  slot: ArraySlotSummary,
} satisfies Partial<
  Record<
    Field["type"],
    (p: {
      label: string;
      field: never;
      value: unknown;
      path: SlotPath;
    }) => ReactNode
  >
>;

type ArrayItemType = keyof typeof arrayItemRenderers;

const ArrayInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path = "",
  propPath = [],
  depth = 0,
  isOpen,
  toggle,
}: FieldProps<Extract<Field, { type: "array" }>, unknown>) => {
  const items = Array.isArray(value) ? (value as ArrayItem[]) : [];
  const displayLabel = toDisplayLabel(label, field.label);
  const open = isOpen?.(path) ?? false;
  const { keyFor, carry } = useItemKeys();
  const { register, focusMoved } = useReorderFocus();

  const fieldEntries = Object.entries(field.arrayFields) as [string, Field][];
  const inline = ArrayItems.isInlineRow(field.arrayFields);
  const secondaryKey = fieldEntries[1]?.[0];

  const summarize = field.getItemSummary;
  const summaryOf = (item: ArrayItem, i: number): string | undefined => {
    if (!summarize) return undefined;
    const s = summarize(item, i);
    return typeof s === "string" && s.trim() ? s : undefined;
  };
  const secondaryOf = (item: ArrayItem): string | undefined => {
    const v = secondaryKey ? item[secondaryKey] : undefined;
    return typeof v === "string" && v ? v : undefined;
  };

  const structural = (next: ArrayItem[], op: ArrayOp, summary?: string) =>
    onChange(next, {
      label: ArrayItems.describe(op, summary),
      coalesce: false,
    });

  const addItem = () => {
    const created = ArrayItems.defaults(field, items.length);
    structural(
      [...items, created],
      { kind: "add" },
      summaryOf(created, items.length),
    );
    if (!inline) {
      const newItemPath = `${path}#${keyFor(created)}`;
      if (!(isOpen?.(newItemPath) ?? false)) toggle?.(newItemPath);
    }
  };

  const removeItem = (i: number) =>
    structural(
      ArrayItems.removeAt(items, i),
      { kind: "remove" },
      summaryOf(items[i], i),
    );

  const moveItem = (i: number, delta: -1 | 1) => {
    const next = ArrayItems.move(items, i, i + delta);
    if (next === items) return;
    const moved = items[i];
    structural(
      next,
      { kind: "move", direction: delta === -1 ? "up" : "down" },
      summaryOf(moved, i),
    );
    focusMoved(keyFor(moved));
  };

  const editField = (
    item: ArrayItem,
    i: number,
    key: string,
    childField: Field,
    fieldPath: string,
  ) => {
    const itemSlotPath: SlotPath = [...propPath, i, key];
    // Array-item sub-fields render sheet-local, dispatched by type through the
    // canvas-only lookup first: a slot is edited on the canvas, never in the
    // sheet (an in-sheet outline would be a second control surface occluding the
    // element it edits) — it renders as an honest read-only canvas-jump summary.
    const CanvasOnly = arrayItemRenderers[childField.type as ArrayItemType];
    if (CanvasOnly)
      return (
        <CanvasOnly
          key={key}
          label={key}
          field={childField as never}
          value={item[key]}
          path={itemSlotPath}
        />
      );
    return (
      <PuckFieldInput
        key={key}
        label={key}
        field={childField}
        value={item[key]}
        onChange={(v, meta) => {
          const next = items.slice();
          next[i] = carry({ ...item, [key]: v }, item);
          onChange(next, meta);
        }}
        readOnly={readOnly}
        path={fieldPath}
        propPath={itemSlotPath}
        depth={depth + 1}
        isOpen={isOpen}
        toggle={toggle}
      />
    );
  };

  const renderRow = (item: ArrayItem, i: number) => {
    const rowKey = keyFor(item);
    const itemPath = `${path}#${rowKey}`;
    const move = {
      canMoveUp: i > 0,
      canMoveDown: i < items.length - 1,
      onMove: (delta: -1 | 1) => moveItem(i, delta),
      remove: ArrayItems.removeGate(items.length, field.min),
      onRemove: () => removeItem(i),
      readOnly,
    };
    if (inline) {
      const [soleKey, soleField] = fieldEntries[0];
      return (
        <ArrayControl.Row
          key={rowKey}
          mode="inline"
          rowRef={register(rowKey)}
          {...move}
        >
          {editField(item, i, soleKey, soleField, `${itemPath}.${soleKey}`)}
        </ArrayControl.Row>
      );
    }
    const itemOpen = isOpen?.(itemPath) ?? false;
    return (
      <ArrayControl.Row
        key={rowKey}
        mode="disclosure"
        rowRef={register(rowKey)}
        summary={summaryOf(item, i) ?? `Item ${i + 1}`}
        secondary={secondaryOf(item)}
        open={itemOpen}
        onToggle={() => toggle?.(itemPath)}
        {...move}
      >
        {itemOpen &&
          fieldEntries.map(([key, childField]) =>
            editField(item, i, key, childField, `${itemPath}.${key}`),
          )}
      </ArrayControl.Row>
    );
  };

  return (
    <div className="array-field">
      <Disclosure.Trigger
        label={displayLabel}
        count={items.length}
        open={open}
        onToggle={() => toggle?.(path)}
      />
      {open && (
        <div className="array-rows">
          {items.map(renderRow)}
          <ArrayControl.Add
            gate={ArrayItems.addGate(items.length, field.max)}
            label={displayLabel}
            onAdd={addItem}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
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
  // Puck's custom render passes a UiState as onChange's second argument —
  // drop it so it is never mistaken for a ChangeMeta commit annotation.
  const change = (v: unknown) => onChange(v);
  return (
    <>{field.render({ field, value, onChange: change, name, id, readOnly })}</>
  );
};

const parseJson = Result.fromThrowable(
  (text: string): unknown => JSON.parse(text),
  () => "invalid-json" as const,
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
          parseJson(raw).match(
            (parsed) => {
              onChange(parsed);
              setInvalid(false);
            },
            () => setInvalid(true),
          );
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
 *  Priority: metadata.control (if registered) → field.type renderer → FallbackField.
 *
 *  The resolved renderer is mounted as an element, never called as `Renderer(props)`.
 *  Invoking it as a function would inline its hooks into this fiber, so a re-target
 *  that swaps the renderer at the same field key (Segmented → Spacing) would change
 *  the hook order and crash. As an element each renderer owns its fiber: a swap is a
 *  clean unmount + mount. */
function PuckFieldInput(props: FieldProps): ReactNode {
  const Renderer = resolveRenderer(
    props as FieldProps<Field, unknown>,
    controlRenderers,
    renderers as Record<string, (p: FieldProps<Field, unknown>) => ReactNode>,
  );
  if (Renderer) return <Renderer {...(props as FieldProps<never, unknown>)} />;
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
  onSelectSlot,
  elementId,
  data,
  config,
  commit,
}: {
  fields: Record<string, Field>;
  values: Record<string, unknown>;
  readOnlyFields?: Partial<Record<string, boolean>>;
  onChange: (key: string, value: unknown, meta?: ChangeMeta) => void;
  onSelectSlot: (parentId: string, path: SlotPath) => void;
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
        selectSlot: (path) => onSelectSlot(elementId, path),
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
              onChange={(v, meta) => onChange(item.key, v, meta)}
              path={item.key}
              propPath={[item.key]}
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
                onChange={(v, meta) => onChange(key, v, meta)}
                path={key}
                propPath={[key]}
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
