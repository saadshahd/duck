/** Pure index arithmetic for the catalog picker's keyboard highlight. The
 *  caller pre-filters its list to the items eligible for highlight (the
 *  picker excludes disallowed/incompatible entries before calling these), so
 *  navigation here only ever has to reason about a flat, valid-only length.
 *  `-1` means "no highlight" (an empty list); wraps at both ends otherwise. */
export const nextHighlight = (current: number, length: number): number => {
  if (length === 0) return -1;
  return current < length - 1 ? current + 1 : 0;
};

export const prevHighlight = (current: number, length: number): number => {
  if (length === 0) return -1;
  return current > 0 ? current - 1 : length - 1;
};
