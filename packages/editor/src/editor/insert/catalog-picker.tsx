import { useState } from "react";
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
import css from "./insert.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

type CatalogPickerProps = {
  registry: FiberRegistry;
  anchor: Anchor;
  config: Config;
  onInsert: (componentType: string) => void;
  onClose: () => void;
  slotAllowedTypes?: ReadonlySet<string>;
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
  onInsert,
}: Entry & { onInsert: (name: string) => void }) {
  return (
    <button
      type="button"
      className="catalog-picker-item"
      data-role="catalog-picker-item"
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
}: CatalogPickerProps) {
  useShadowSheet(css);
  const [filter, setFilter] = useState("");
  const filterRef = useAutoFocus<HTMLInputElement>();

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useAnchor(refs, registry, anchor);

  useOnClickOutside(refs.floating, onClose);

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

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="catalog-picker"
      data-role="catalog-picker"
    >
      <input
        ref={filterRef}
        type="text"
        className="catalog-picker-filter"
        placeholder="Filter components…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="catalog-picker-list">
        {valid.length === 0 && incompatible.length === 0 && (
          <div className="catalog-picker-empty">No matches</div>
        )}
        {valid.map((e) => (
          <PickerItem key={e.name} {...e} onInsert={onInsert} />
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
              <PickerItem key={e.name} {...e} onInsert={onInsert} />
            ))}
          </details>
        )}
      </div>
    </div>
  );
}
