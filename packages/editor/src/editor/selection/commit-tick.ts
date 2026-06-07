/** How many committed prop edits the selected element has, derived from history
 *  entries grouped under `prop:<id>`. Drives the breadcrumb commit flash: each
 *  increment remounts the flash to replay its animation. */
export const commitTick = (
  entries: readonly { group?: string }[],
  lastSelectedId: string | null,
): number =>
  lastSelectedId
    ? entries.filter((e) => e.group === `prop:${lastSelectedId}`).length
    : 0;
