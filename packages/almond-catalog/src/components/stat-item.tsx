/**
 * StatItem — a single figure for the StatBand collection (sp-64 §3.2).
 *
 * A leaf: a large `value` over a small `label`. Both are content strings (the value
 * carries its own unit, e.g. "4.1%") — no numeric coercion, no formatting policy in
 * the DS. Themed from ambient tokens via the colocated CSS.
 */

import type { ComponentConfig } from "@puckeditor/core";
import "./stat-item.css";

export interface StatItemProps {
  value: string;
  label: string;
}

export function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="almond-stat">
      <span className="almond-stat__value">{value}</span>
      <span className="almond-stat__label">{label}</span>
    </div>
  );
}

export const statItemConfig: ComponentConfig<StatItemProps> = {
  fields: {
    value: { type: "text" },
    label: { type: "text" },
  },
  defaultProps: { value: "0", label: "hidden fees" },
  render: ({ value, label }) => <StatItem value={value} label={label} />,
};
