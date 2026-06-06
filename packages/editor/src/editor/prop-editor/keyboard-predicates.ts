/** Single visible character, no modifiers, not mid-IME composition.
 *  Space is excluded: it is the carry-lift key, never a type-to-edit trigger. */
export const isPrintable = (e: KeyboardEvent): boolean =>
  e.key.length === 1 &&
  e.key !== " " &&
  !e.metaKey &&
  !e.ctrlKey &&
  !e.altKey &&
  !e.isComposing;
