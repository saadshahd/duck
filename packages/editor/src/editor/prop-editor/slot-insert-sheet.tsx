import { useState } from "react";
import type { Config } from "@puckeditor/core";
import { useShadowSheet, useAutoFocus } from "../overlay/index.js";
import css from "./slot-insert-sheet.css?inline";

type Entry = { name: string; label: string };
const entriesOf = (config: Config): Entry[] =>
  Object.entries(config.components ?? {}).map(([name, c]) => ({
    name,
    label: (c as { label?: string }).label ?? name,
  }));

type SlotInsertSheetProps = {
  config: Config;
  onSelect: (componentType: string) => void;
  onClose: () => void;
};

export function SlotInsertSheet({
  config,
  onSelect,
  onClose,
}: SlotInsertSheetProps) {
  useShadowSheet(css);
  const [filter, setFilter] = useState("");
  const filterRef = useAutoFocus<HTMLInputElement>();
  const needle = filter.toLowerCase();
  const entries = entriesOf(config).filter(
    ({ name, label }) =>
      name.toLowerCase().includes(needle) ||
      label.toLowerCase().includes(needle),
  );
  return (
    <div
      className="slot-insert-sheet"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="slot-insert-sheet-header">
        <span className="slot-insert-sheet-label">Add component</span>
        <button
          className="slot-insert-sheet-close"
          type="button"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ×
        </button>
      </div>
      <input
        ref={filterRef}
        type="search"
        className="slot-insert-filter"
        placeholder="Filter components…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="slot-insert-list" role="list">
        {entries.map(({ name, label }) => (
          <li key={name}>
            <button
              type="button"
              className="slot-insert-item"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(name);
              }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      {entries.length === 0 && (
        <p className="slot-insert-empty">No components match.</p>
      )}
    </div>
  );
}
