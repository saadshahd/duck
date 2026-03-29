import { useState, useCallback } from "react";
import { format } from "timeago.js";
import { useShadowSheet } from "../overlay/index.js";
import type { Snapshot } from "./types.js";
import css from "./history-overlay.css?inline";

type HistoryOverlayProps = {
  entries: readonly Snapshot[];
  currentIndex: number;
  onRestore: (index: number) => void;
  onRename: (index: number, name: string) => void;
  onClose: () => void;
};

export function HistoryOverlay({
  entries,
  currentIndex,
  onRestore,
  onRename,
  onClose,
}: HistoryOverlayProps) {
  useShadowSheet(css);

  return (
    <div className="history-overlay" data-role="history-overlay">
      <div className="history-header">
        <span className="history-title">History</span>
        <button
          type="button"
          className="history-close"
          onClick={onClose}
          data-role="history-close"
        >
          ×
        </button>
      </div>
      {[...entries].reverse().map((entry, reverseIdx) => {
        const idx = entries.length - 1 - reverseIdx;
        return (
          <HistoryEntry
            key={`${idx}-${entry.timestamp}`}
            entry={entry}
            index={idx}
            isCurrent={idx === currentIndex}
            onRestore={onRestore}
            onRename={onRename}
          />
        );
      })}
    </div>
  );
}

function HistoryEntry({
  entry,
  index,
  isCurrent,
  onRestore,
  onRename,
}: {
  entry: Snapshot;
  index: number;
  isCurrent: boolean;
  onRestore: (index: number) => void;
  onRename: (index: number, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  const handleLabelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  }, []);

  const handleRenameCommit = useCallback(
    (value: string) => {
      setEditing(false);
      if (value.trim()) onRename(index, value.trim());
    },
    [index, onRename],
  );

  const isNamed = !!entry.name;

  return (
    <div
      className="history-entry"
      data-role="history-entry"
      {...(isCurrent && { "data-current": "" })}
      {...(isNamed && { "data-named": "" })}
      onClick={() => onRestore(index)}
    >
      {editing ? (
        <RenameInput
          initial={entry.name ?? entry.label}
          onCommit={handleRenameCommit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span
          className="history-label"
          {...(isNamed && { "data-named": "" })}
          onClick={handleLabelClick}
        >
          {entry.name ?? entry.label}
        </span>
      )}
      <span className="history-timestamp">{format(entry.timestamp)}</span>
    </div>
  );
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <input
      className="history-rename-input"
      data-role="history-rename"
      type="text"
      defaultValue={initial}
      autoFocus
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit(e.currentTarget.value);
        if (e.key === "Escape") onCancel();
      }}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
