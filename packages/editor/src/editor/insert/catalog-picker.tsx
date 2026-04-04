import { useEffect, useRef, useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import {
  useShadowSheet,
  useOnClickOutside,
  useRegistryAnchor,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { ComponentCatalog } from "../types.js";
import css from "./insert.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

type CatalogPickerProps = {
  registry: FiberRegistry;
  elementId: string;
  catalog: ComponentCatalog;
  onInsert: (componentType: string) => void;
  onClose: () => void;
};

export function CatalogPicker({
  registry,
  elementId,
  catalog,
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
  const entries = Object.entries(catalog).filter(
    ([type, { description }]) =>
      type.toLowerCase().includes(needle) ||
      description.toLowerCase().includes(needle),
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
        {entries.map(([type, { description }]) => (
          <button
            key={type}
            type="button"
            className="catalog-picker-item"
            onClick={(e) => {
              e.stopPropagation();
              onInsert(type);
            }}
          >
            <span className="catalog-picker-item-type">{type}</span>
            <span className="catalog-picker-item-desc">{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
