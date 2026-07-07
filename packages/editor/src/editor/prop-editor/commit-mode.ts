/** How a control commits edits to the document — the single commit-timing axis.
 *  `continuous` = free typing / scrubbing: one shared debounce window, flushed on
 *  blur and Enter. `discrete` = click / pick / step: commits within a frame. */
export type CommitMode = { kind: "continuous" } | { kind: "discrete" };

/** The one idle window every continuous control shares before it flushes a
 *  debounced commit. Canvas preview and the grouped history entry flush together;
 *  no continuous control may exceed this window. */
export const CONTINUOUS_DEBOUNCE_MS = 300;

const continuous: CommitMode = { kind: "continuous" };
const discrete: CommitMode = { kind: "discrete" };

/** commitMode :: controlId → CommitMode — the inspectable commit-timing policy,
 *  keyed by field type and bespoke control id. Continuous controls route through
 *  `useDebouncedText`; discrete controls call `onChange` synchronously. */
export const COMMIT = {
  text: continuous,
  textarea: continuous,
  number: continuous,
  richtext: continuous,
  select: discrete,
  radio: discrete,
  object: discrete,
  array: discrete,
  slot: discrete,
  external: discrete,
  custom: discrete,
  dimension: discrete,
  segmented: discrete,
  swatch: discrete,
} as const satisfies Record<string, CommitMode>;

export type ControlId = keyof typeof COMMIT;
