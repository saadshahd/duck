/**
 * Pure presentation rule for a Puck `radio` field: does its option set read best
 * as a horizontal segmented row or a vertical stacked group?
 *
 * Segmented reads as one compact control — right for a few short choices (a
 * boolean's 2-option radio, a Low/Medium/High enum). It stops fitting the sheet's
 * one content column once options grow in count or label length, so beyond the
 * threshold the group stacks: one option per row, each label given full width.
 *
 * Data in, layout out — no DOM, no field access beyond the option labels.
 */

/** Above this many options, a horizontal row no longer fits the sheet column. */
const MAX_SEGMENTED_OPTIONS = 3;
/** Above this label length, three-across labels crowd or truncate. */
const MAX_SEGMENTED_LABEL = 10;

export type RadioLayout = "segmented" | "stacked";

/** segmented when the set is small AND every label is short; stacked otherwise. */
export const radioLayout = (
  options: readonly { label: string }[],
): RadioLayout => {
  if (options.length === 0 || options.length > MAX_SEGMENTED_OPTIONS)
    return "stacked";
  const longest = options.reduce((m, o) => Math.max(m, o.label.length), 0);
  return longest > MAX_SEGMENTED_LABEL ? "stacked" : "segmented";
};
