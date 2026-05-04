const nonEmptyText: NodeFilter = {
    acceptNode: (n) =>
        n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
};

export const hasSingleTextNode = (el: HTMLElement) => {
    const iter = document.createNodeIterator(
        el,
        NodeFilter.SHOW_TEXT,
        nonEmptyText,
    );

    const firstNode = iter.nextNode();
    const secondNode = iter.nextNode();

    return firstNode && !secondNode;
};
