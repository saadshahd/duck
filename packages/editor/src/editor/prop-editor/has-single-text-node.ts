const nonEmptyText: NodeFilter = {
  acceptNode: (n) =>
    n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
};

const findSingleTextNode = (el: HTMLElement): Text | null => {
  const iter = document.createNodeIterator(
    el,
    NodeFilter.SHOW_TEXT,
    nonEmptyText,
  );

  const firstNode = iter.nextNode();
  const secondNode = iter.nextNode();

  return firstNode && !secondNode ? (firstNode as Text) : null;
};

export const hasSingleTextNode = (el: HTMLElement): boolean =>
  !!findSingleTextNode(el);

/**
 * The element that owns the single text node — the inline-edit surface.
 * Editing there (not the component's wrapper) inherits the text's own
 * typography and background, so inline editing is visually in place.
 */
export const findTextHost = (el: HTMLElement): HTMLElement =>
  findSingleTextNode(el)?.parentElement ?? el;
