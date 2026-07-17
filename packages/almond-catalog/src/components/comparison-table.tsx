/**
 * ComparisonTable — a resolved/computed widget: an "us vs competitors × capabilities" trust
 * table read entirely from comparisons.ts (sp-64 §3.3c, §6).
 *
 * BARE — zero text props. Everything on screen (labels, competitor names, verdicts) comes
 * from the compliance-owned data module; the editor's only levers are two semantic selects,
 * `comparisonSet` and `goal`, both flagged `morphable:false` (§5.4) so they stay in the prop
 * editor and out of the presentational morph picker — they change WHAT it says, not HOW it
 * looks. The Almond column is highlighted internally, never editor-toggled.
 *
 * A widget carries its own `theme` (§5.1) but is decorated WITHIN a sibling organism, so it
 * paints a `data-theme` root rather than a nested `SectionShell` <section>. Resolution is
 * total: an unknown set renders a labeled placeholder (§6; dangling state finished in T12).
 */

import type { ComponentConfig } from "@puckeditor/core";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import { themeField } from "./theme-field";
import {
  type ComparisonSetId,
  type Verdict,
  comparisons,
  resolveComparison,
} from "../data/comparisons";
import "./comparison-table.css";

export interface ComparisonTableProps {
  theme: ThemeName;
  comparisonSet: string;
  goal: string;
}

const VERDICT_MARK = {
  yes: "✓",
  partial: "~",
  no: "✕",
  na: "–",
} as const satisfies Record<Verdict | "na", string>;

const VERDICT_LABEL = {
  yes: "Yes",
  partial: "Partial",
  no: "No",
  na: "Not applicable",
} as const satisfies Record<Verdict | "na", string>;

export function ComparisonTable({
  theme,
  comparisonSet,
  goal,
}: ComparisonTableProps) {
  const resolved = resolveComparison(comparisonSet, goal);

  if (!resolved) {
    return (
      <div
        className="almond-comparison almond-comparison--missing"
        data-theme={theme}
        role="note"
      >
        Unknown comparison “{comparisonSet}”
      </div>
    );
  }

  const { label, competitors, capabilities, verdictOf } = resolved;

  return (
    <div className="almond-comparison" data-theme={theme}>
      <table className="almond-comparison__table">
        <caption className="almond-comparison__caption">{label}</caption>
        <thead>
          <tr>
            <td />
            {competitors.map((competitor) => (
              <th
                key={competitor.id}
                scope="col"
                data-almond={competitor.isAlmond || undefined}
              >
                {competitor.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capabilities.map((capability) => (
            <tr key={capability.id}>
              <th scope="row">{capability.label}</th>
              {competitors.map((competitor) => {
                const verdict = verdictOf(competitor.id, capability.id) ?? "na";
                return (
                  <td
                    key={competitor.id}
                    data-almond={competitor.isAlmond || undefined}
                    data-verdict={verdict}
                  >
                    <span
                      className="almond-comparison__mark"
                      aria-hidden="true"
                    >
                      {VERDICT_MARK[verdict]}
                    </span>
                    <span className="almond-comparison__sr">
                      {VERDICT_LABEL[verdict]}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const comparisonSetOptions = (
  Object.keys(comparisons) as ComparisonSetId[]
).map((id) => ({ label: comparisons[id].label, value: id }));

/** Distinct goal ids across every set — a flat select; resolution scopes it per set. */
const goalOptions = [
  ...new Map(
    Object.values(comparisons)
      .flatMap((set) => Object.entries(set.goals))
      .map(([value, goal]) => [value, { label: goal.label, value }]),
  ).values(),
];

export const comparisonTableConfig: ComponentConfig<ComparisonTableProps> = {
  fields: {
    theme: themeField,
    comparisonSet: {
      type: "select",
      options: comparisonSetOptions,
      metadata: { morphable: false },
    },
    goal: {
      type: "select",
      options: goalOptions,
      metadata: { morphable: false },
    },
  },
  defaultProps: { theme: DEFAULT_THEME, comparisonSet: "send", goal: "full" },
  render: ({ theme, comparisonSet, goal }) => (
    <ComparisonTable theme={theme} comparisonSet={comparisonSet} goal={goal} />
  ),
};
