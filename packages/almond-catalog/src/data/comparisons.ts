/**
 * comparisons — the compliance/engineering-owned competitive comparison corpus (sp-64 §6).
 *
 * NOT a general content-reference: a hard-coded set ComparisonTable is the only consumer of,
 * keyed by a `comparisonSet` the editor picks through a semantic select and lensed by a
 * `goal` that narrows which capability rows show. Verdicts are approved once here, never
 * authored in the editor — a "us vs competitors" trust table cannot claim something legal
 * has not cleared.
 *
 * Resolution is TOTAL: an unknown set yields null so ComparisonTable renders a labeled
 * placeholder instead of crashing (dangling state finished in T12); an unrecognized goal
 * falls back to the full capability set rather than an empty table; a missing verdict cell
 * yields null so the table shows a neutral dash, never a guessed yes/no.
 */

export type Verdict = "yes" | "partial" | "no";

export interface Capability {
  id: string;
  label: string;
}

export interface Competitor {
  id: string;
  name: string;
  /** The Almond column — highlighted internally by ComparisonTable, never editor-set. */
  isAlmond?: boolean;
}

export interface Goal {
  label: string;
  /** The capability ids this lens foregrounds. */
  capabilities: string[];
}

export interface ComparisonSet {
  label: string;
  competitors: Competitor[];
  capabilities: Capability[];
  /** verdicts[competitorId][capabilityId] — fully populated by construction. */
  verdicts: Record<string, Record<string, Verdict>>;
  goals: Record<string, Goal>;
}

export const comparisons = {
  send: {
    label: "Sending money abroad",
    competitors: [
      { id: "almond", name: "Almond", isAlmond: true },
      { id: "bank", name: "High-street bank" },
      { id: "wallet", name: "Payment app" },
    ],
    capabilities: [
      { id: "realRate", label: "Real exchange rate" },
      { id: "noMarkup", label: "No hidden markup" },
      { id: "sameDay", label: "Same-day arrival" },
      { id: "weekend", label: "Weekend transfers" },
    ],
    verdicts: {
      almond: {
        realRate: "yes",
        noMarkup: "yes",
        sameDay: "yes",
        weekend: "yes",
      },
      bank: {
        realRate: "no",
        noMarkup: "no",
        sameDay: "partial",
        weekend: "no",
      },
      wallet: {
        realRate: "partial",
        noMarkup: "no",
        sameDay: "yes",
        weekend: "yes",
      },
    },
    goals: {
      transparency: {
        label: "Transparency",
        capabilities: ["realRate", "noMarkup"],
      },
      speed: { label: "Speed", capabilities: ["sameDay", "weekend"] },
      full: {
        label: "Full comparison",
        capabilities: ["realRate", "noMarkup", "sameDay", "weekend"],
      },
    },
  },
  everyday: {
    label: "Your everyday account",
    competitors: [
      { id: "almond", name: "Almond", isAlmond: true },
      { id: "bank", name: "High-street bank" },
      { id: "neobank", name: "Other neobank" },
    ],
    capabilities: [
      { id: "freeAccount", label: "Free account" },
      { id: "instantSpend", label: "Instant spend alerts" },
      { id: "noFxAbroad", label: "No FX markup abroad" },
      { id: "interest", label: "Interest on balance" },
    ],
    verdicts: {
      almond: {
        freeAccount: "yes",
        instantSpend: "yes",
        noFxAbroad: "yes",
        interest: "yes",
      },
      bank: {
        freeAccount: "partial",
        instantSpend: "partial",
        noFxAbroad: "no",
        interest: "no",
      },
      neobank: {
        freeAccount: "yes",
        instantSpend: "yes",
        noFxAbroad: "partial",
        interest: "partial",
      },
    },
    goals: {
      cost: { label: "Cost", capabilities: ["freeAccount", "noFxAbroad"] },
      everyday: {
        label: "Everyday use",
        capabilities: ["instantSpend", "interest"],
      },
      full: {
        label: "Full comparison",
        capabilities: ["freeAccount", "instantSpend", "noFxAbroad", "interest"],
      },
    },
  },
} as const satisfies Record<string, ComparisonSet>;

export type ComparisonSetId = keyof typeof comparisons;

export interface ResolvedComparison {
  label: string;
  competitors: readonly Competitor[];
  /** Capabilities after the goal lens (all of them when the goal is unrecognized). */
  capabilities: readonly Capability[];
  /** The approved verdict for a cell, or null when none is recorded (shown as a dash). */
  verdictOf(competitorId: string, capabilityId: string): Verdict | null;
}

/** Resolve a (possibly stale) set id + goal lens; an unknown set yields null, never throws. */
export function resolveComparison(
  setId: string,
  goal?: string,
): ResolvedComparison | null {
  if (!Object.hasOwn(comparisons, setId)) return null;
  // hasOwn proved the key; widen to the interface so the string-keyed goal/verdict
  // lookups below index cleanly (the const corpus narrows keys to literals).
  const set: ComparisonSet = comparisons[setId as ComparisonSetId];

  const goalLens = goal ? set.goals[goal] : undefined;
  const capabilities = goalLens
    ? set.capabilities.filter((cap) => goalLens.capabilities.includes(cap.id))
    : set.capabilities;

  return {
    label: set.label,
    competitors: set.competitors,
    capabilities,
    verdictOf: (competitorId, capabilityId) =>
      set.verdicts[competitorId]?.[capabilityId] ?? null,
  };
}
