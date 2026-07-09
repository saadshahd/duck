import type { ComponentData } from "@puckeditor/core";

/** A prop-path addressing a slot's children array inside a component's props.
 *  Segments alternate prop name (string) and array index (number):
 *  top-level slot → `["content"]`; array-item slot → `["items", 2, "content"]`. */
export type SlotPath = readonly (string | number)[];

/** Where a set of children lives: the root content array, or a specific slot
 *  of a specific parent. Root and slot are mutually exclusive — a slot site
 *  always carries both parentId and a prop-path, so a half-set location cannot
 *  be represented. */
export type ParentSite =
  | { readonly at: "root" }
  | {
      readonly at: "slot";
      readonly parentId: string;
      readonly path: SlotPath;
    };

/** A position within a site: the site plus the index into it.
 *  `{ at: "root", index }` → `data.content[index]`.
 *  `{ at: "slot", parentId, path, index }` → `getIn(parent.props, path)[index]`. */
export type PathStep = ParentSite & { readonly index: number };

export type Path = readonly PathStep[];

/** Resolve a nested value by walking a prop-path. Returns undefined when any
 *  segment is absent; callers narrow the shape they expect. */
export const getIn = (root: ComponentData["props"], path: SlotPath): unknown =>
  path.reduce<unknown>(
    (value, segment) =>
      value ? (value as Record<string | number, unknown>)[segment] : value,
    root,
  );

/** The slot field name a prop-path addresses — its trailing string segment.
 *  A slot path always ends in the slot key; array indices are intermediate. */
export const slotKeyOf = (path: SlotPath): string =>
  path[path.length - 1] as string;

/** Whether two prop-paths address the same slot — equal length, equal segments. */
export const samePath = (a: SlotPath, b: SlotPath): boolean =>
  a.length === b.length && a.every((segment, i) => segment === b[i]);

/** Whether two sites point at the same children array. */
export const sameSite = (a: ParentSite, b: ParentSite): boolean =>
  a.at === "root"
    ? b.at === "root"
    : b.at === "slot" && a.parentId === b.parentId && samePath(a.path, b.path);

/** The parent id of a site, or null at the root. */
export const parentIdOf = (site: ParentSite): string | null =>
  site.at === "slot" ? site.parentId : null;
