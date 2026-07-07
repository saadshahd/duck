import { useState, type KeyboardEvent } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { Config } from "@puckeditor/core";
import {
  useShadowSheet,
  useOnClickOutside,
  useAnchor,
  useAutoFocus,
  type Anchor,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { SpecOpsError } from "../spec-ops/index.js";
import type { InsertOutcome } from "./use-insert.js";
import { nextHighlight, prevHighlight } from "./highlight.js";
import css from "./insert.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

const NOT_ALLOWED_HERE = "Not allowed in this slot";

/** Human-readable rejection for a failed insert — the honest counterpart to
 *  the disabled affordance, shown when the write itself refuses. */
const rejected = (error: SpecOpsError): string =>
  error.tag === "disallowed-type"
    ? `${error.componentType} is not allowed in ${error.slotKey}.`
    : `Insert failed: ${error.tag.replaceAll("-", " ")}.`;

type CatalogPickerProps = {
  registry: FiberRegistry;
  anchor: Anchor;
  config: Config;
  onInsert: (componentType: string) => InsertOutcome;
  onClose: () => void;
  slotAllowedTypes?: ReadonlySet<string>;
  /** The targeted slot's display label (e.g. "Card › header"). Names the slot
   *  in the disabled-item reason instead of the generic "this slot". */
  slotLabel?: string;
};

type Entry = { name: string; label: string };

const entriesOf = (config: Config): Entry[] =>
  Object.entries(config.components ?? {}).map(([name, component]) => ({
    name,
    label: (component as { label?: string })?.label ?? name,
  }));

function PickerItem({
  name,
  label,
  disallowed,
  reason = NOT_ALLOWED_HERE,
  active,
  onInsert,
}: Entry & {
  disallowed?: boolean;
  reason?: string;
  active?: boolean;
  onInsert: (name: string) => void;
}) {
  return (
    <button
      type="button"
      className="catalog-picker-item"
      data-role="catalog-picker-item"
      data-active={active ? "" : undefined}
      disabled={disallowed}
      aria-selected={active}
      title={disallowed ? reason : undefined}
      aria-label={disallowed ? `${name} — ${reason}` : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onInsert(name);
      }}
    >
      <span
        className="catalog-picker-item-type"
        data-role="catalog-picker-item-type"
      >
        {name}
      </span>
      {label !== name && (
        <span className="catalog-picker-item-desc">{label}</span>
      )}
    </button>
  );
}

export function CatalogPicker({
  registry,
  anchor,
  config,
  onInsert,
  onClose,
  slotAllowedTypes,
  slotLabel,
}: CatalogPickerProps) {
  useShadowSheet(css);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  const filterRef = useAutoFocus<HTMLInputElement>();

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useAnchor(refs, registry, anchor);

  useOnClickOutside(refs.floating, onClose);

  const insert = (name: string) => {
    const outcome = onInsert(name);
    if (outcome && outcome.isErr()) setNotice(rejected(outcome.error));
  };

  const needle = filter.toLowerCase();
  const all = entriesOf(config).filter(
    ({ name, label }) =>
      name.toLowerCase().includes(needle) ||
      label.toLowerCase().includes(needle),
  );

  const { valid, incompatible } = slotAllowedTypes
    ? {
        valid: all.filter(({ name }) => slotAllowedTypes.has(name)),
        incompatible: all.filter(({ name }) => !slotAllowedTypes.has(name)),
      }
    : { valid: all, incompatible: [] };

  // Highlight is tracked by name, not raw index — a filter keystroke reshuffles
  // `valid`, and a name-lookup survives that reshuffle instead of pointing at
  // whatever now sits at the old index. Falls back to the first valid item
  // when nothing is highlighted yet or the highlighted name filtered out.
  const lookedUp = valid.findIndex(({ name }) => name === highlightedName);
  const activeIndex = valid.length === 0 ? -1 : lookedUp === -1 ? 0 : lookedUp;

  const moveHighlight = (next: number) =>
    setHighlightedName(next === -1 ? null : (valid[next]?.name ?? null));

  // Full containment while the picker is focused: every keystroke stops here
  // and never reaches the global tinykeys(window, …) bindings (undo, delete,
  // clipboard, arrow-key selection, "/") or the canvas beneath. Only the keys
  // the picker itself interprets get preventDefault; plain typing still
  // reaches the filter input's own onChange.
  //
  // Exception: the "Incompatible" disclosure's <summary> owns its own
  // Enter/Space (native toggle). Containment still stops propagation so
  // nothing escapes to the window, but it must not preventDefault Enter while
  // the summary itself has focus — that would suppress the native toggle
  // with no picker behavior to replace it.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const onSummary = (e.target as HTMLElement).tagName === "SUMMARY";
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(nextHighlight(activeIndex, valid.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(prevHighlight(activeIndex, valid.length));
    } else if (e.key === "Enter") {
      if (onSummary) return; // Let the browser toggle the disclosure natively.
      e.preventDefault();
      if (activeIndex !== -1) insert(valid[activeIndex].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="catalog-picker"
      data-role="catalog-picker"
      onKeyDown={onKeyDown}
    >
      <input
        ref={filterRef}
        type="text"
        className="catalog-picker-filter"
        placeholder="Filter components…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="catalog-picker-list" role="listbox">
        {valid.length === 0 && incompatible.length === 0 && (
          <div className="catalog-picker-empty">No matches</div>
        )}
        {valid.map((e, i) => (
          <PickerItem
            key={e.name}
            {...e}
            active={i === activeIndex}
            onInsert={insert}
          />
        ))}
        {incompatible.length > 0 && (
          <details
            className="catalog-picker-incompatible"
            data-role="catalog-picker-incompatible"
          >
            <summary className="catalog-picker-incompatible-summary">
              Incompatible ({incompatible.length})
            </summary>
            {incompatible.map((e) => (
              <PickerItem
                key={e.name}
                {...e}
                disallowed
                reason={
                  slotLabel ? `Not allowed in ${slotLabel}` : NOT_ALLOWED_HERE
                }
                onInsert={insert}
              />
            ))}
          </details>
        )}
      </div>
      {notice && (
        <div
          role="alert"
          className="catalog-picker-notice"
          data-role="catalog-picker-notice"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
