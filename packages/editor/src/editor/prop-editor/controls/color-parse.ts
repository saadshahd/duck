/** Color literal validation for the swatch's free-form input.
 *  Validation delegates to the engine's CSS value parser by probing a detached
 *  element's style declaration — the same judgement CSS.supports("color", v)
 *  gives, but it also works under happy-dom in unit tests, where CSS.supports
 *  is a stub that accepts everything. The probed value is never stored: the
 *  committed literal is exactly what the user typed, no normalization. */

// isCssColor :: string => boolean
export const isCssColor = (raw: string): boolean => {
  const value = raw.trim();
  if (!value) return false;
  const probe = document.createElement("span").style;
  probe.color = value;
  return probe.color !== "";
};

/** The native <input type="color"> only accepts #rrggbb; any other stored
 *  literal (named, rgb(), short hex) cannot seed it. */
// toPickerHex :: string => string | undefined
export const toPickerHex = (value: string): string | undefined =>
  /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : undefined;
