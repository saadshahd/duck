/**
 * Parse the leading numeric token from a CSS dimension string.
 *
 * Dimension values are stored as full CSS strings ("1.5rem", "9999px", "0").
 * We extract only the leading number so a NumberInput can display and commit
 * an off-grid override (e.g. the user types 1.75 → we store "1.75rem").
 *
 * Compound values like "0 auto" or "1rem 0" have a parseable leading token
 * (0 and 1 respectively), so the numeric input can round-trip the leading
 * number while chip selection handles the full compound form.
 *
 * Returns undefined when there is no finite leading number (e.g. "auto", "").
 */
export const parseLeadingNumber = (value: string): number | undefined => {
  if (!value) return undefined;
  // Match an optional leading minus and a decimal number at the start of the string.
  const match = /^-?\d+(\.\d+)?/.exec(value.trim());
  if (!match) return undefined;
  const n = parseFloat(match[0]);
  return isFinite(n) ? n : undefined;
};
