export type DraftRegistry = {
  claim(page: string): void;
  owns(page: string): boolean;
  release(page: string): void;
};

export const createDraftRegistry = (): DraftRegistry => {
  const pages = new Set<string>();
  return {
    claim: (page) => void pages.add(page),
    owns: (page) => pages.has(page),
    release: (page) => void pages.delete(page),
  };
};
