import type { ReactNode } from "react";

function Root({ children }: { children: ReactNode }) {
  return <div className="disclosure">{children}</div>;
}

function Trigger({
  label,
  count,
  open,
  onToggle,
}: {
  label: ReactNode;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="disclosure-trigger"
      data-role="disclosure-trigger"
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="disclosure-chevron">{open ? "▾" : "▸"}</span>
      <span className="disclosure-label">{label}</span>
      {count !== undefined && <span className="disclosure-count">{count}</span>}
    </button>
  );
}

function Panel({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <div
      className="disclosure-panel"
      role="group"
      style={{ paddingLeft: `${Math.min(depth, 3) * 16}px` }}
    >
      {children}
    </div>
  );
}

export const Disclosure = { Root, Trigger, Panel } as const;
