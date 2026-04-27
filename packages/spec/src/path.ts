/** Position in a Puck Data tree.
 *  Empty path = top of tree (one of `data.content[i]`).
 *  parentId === null && slotKey === null → location is `data.content[index]`.
 *  parentId === "abc" && slotKey === "items" → location is component "abc"'s `props.items[index]`. */
export type PathStep = {
  readonly parentId: string | null;
  readonly slotKey: string | null;
  readonly index: number;
};

export type Path = readonly PathStep[];
