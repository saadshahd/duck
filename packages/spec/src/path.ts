/** Where a set of children lives: the root content array, or a specific slot
 *  of a specific parent. Root and slot are mutually exclusive — a slot site
 *  always carries both parentId and slotKey, so a half-set location cannot be
 *  represented. */
export type ParentSite =
  | { readonly at: "root" }
  | {
      readonly at: "slot";
      readonly parentId: string;
      readonly slotKey: string;
    };

/** A position within a site: the site plus the index into it.
 *  `{ at: "root", index }` → `data.content[index]`.
 *  `{ at: "slot", parentId, slotKey, index }` → parent's `props[slotKey][index]`. */
export type PathStep = ParentSite & { readonly index: number };

export type Path = readonly PathStep[];

/** Whether two sites point at the same children array. */
export const sameSite = (a: ParentSite, b: ParentSite): boolean =>
  a.at === "root"
    ? b.at === "root"
    : b.at === "slot" && a.parentId === b.parentId && a.slotKey === b.slotKey;

/** The parent id of a site, or null at the root. */
export const parentIdOf = (site: ParentSite): string | null =>
  site.at === "slot" ? site.parentId : null;
