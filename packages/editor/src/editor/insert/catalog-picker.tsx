import { useEffect, useRef, useState } from "react";
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
  useRegistryAnchor,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import css from "./insert.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

type CatalogPickerProps = {
  registry: FiberRegistry;
  elementId: string;
  config: Config;
  onInsert: (componentType: string) => void;
  onClose: () => void;
};

type Entry = { name: string; label: string };

const entriesOf = (config: Config): Entry[] =>
  Object.entries(config.components ?? {}).map(([name, component]) => ({
    name,
    label: (component as { label?: string })?.label ?? name,
  }));

export function CatalogPicker({
  registry,
  elementId,
  config,
  onInsert,
  onClose,
}: CatalogPickerProps) {
  useShadowSheet(css);
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useRegistryAnchor(refs, registry, elementId);
  useOnClickOutside(refs.floating, onClose);

  useEffect(function focusFilter() {
    filterRef.current?.focus();
  }, []);

  const needle = filter.toLowerCase();
  const entries = entriesOf(config).filter(
    ({ name, label }) =>
      name.toLowerCase().includes(needle) ||
      label.toLowerCase().includes(needle),
  );

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
        {entries.length === 0 && (
          <div className="catalog-picker-empty">No matches</div>
        )}
        {entries.map(({ name, label }) => (
          <button
            key={name}
            type="button"
            className="catalog-picker-item"
            onClick={(e) => {
              e.stopPropagation();
              onInsert(name);
            }}
          >
            <span className="catalog-picker-item-type">{name}</span>
            {label !== name && (
              <span className="catalog-picker-item-desc">{label}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
