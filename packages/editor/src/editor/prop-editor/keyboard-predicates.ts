/** Single visible character, no modifiers, not mid-IME composition. */
export const isPrintable = (e: KeyboardEvent): boolean =>
  e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.isComposing;
