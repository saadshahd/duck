/**
 * disclosures — the compliance/legal-owned corpus of approved legal snippets (sp-64 §6).
 *
 * NOT free authoring: a fixed set of pre-cleared strings, keyed by a stable id, that
 * DisclosureBand (T6) and the Footer chrome surface through a semantic multi-select — the
 * editor picks WHICH approved snippets appear, never their wording. Resolution is TOTAL:
 * unknown ids are dropped rather than invented, so a stale reference can never fabricate a
 * legal statement.
 */

export interface Disclosure {
  id: string;
  label: string;
  body: string;
}

export const disclosures = {
  deposits: {
    id: "deposits",
    label: "Deposit protection",
    body: "Eligible deposits are protected up to £85,000 by the Financial Services Compensation Scheme.",
  },
  fx: {
    id: "fx",
    label: "Exchange rates",
    body: "Exchange rates are indicative and move through the day; the rate applied is the one shown at the moment your transfer is confirmed.",
  },
  aer: {
    id: "aer",
    label: "Interest (AER)",
    body: "AER (Annual Equivalent Rate) shows what the interest rate would be if paid and compounded once a year. Rates are variable.",
  },
  capital: {
    id: "capital",
    label: "Capital at risk",
    body: "Almond is a money service, not a bank. Investments can fall as well as rise and you may get back less than you put in.",
  },
} as const satisfies Record<string, Disclosure>;

export type DisclosureId = keyof typeof disclosures;

/** Resolve ids to approved snippets, preserving order and silently dropping unknowns. */
export function resolveDisclosures(ids: readonly string[]): Disclosure[] {
  return ids
    .filter((id): id is DisclosureId => Object.hasOwn(disclosures, id))
    .map((id) => disclosures[id]);
}
