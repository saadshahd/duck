import type { ReactNode } from "react";

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
      <span className="disclosure-chevron" aria-hidden>
        ▸
      </span>
      <span className="disclosure-label">{label}</span>
      {count !== undefined && <span className="disclosure-count">{count}</span>}
    </button>
  );
}

export const Disclosure = { Trigger } as const;
