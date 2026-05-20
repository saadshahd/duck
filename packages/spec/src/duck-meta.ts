/** RSC-safe sidecar manifest enriching a vanilla Puck config with editor-only metadata.
 *  JSON only — no functions, no React components. Removing it must leave the Puck config
 *  fully functional. Keyed by component name to mirror Puck's `components`. */

export type SlotMeta = {
  readonly optional?: boolean;
};

export type ComponentMeta = {
  readonly slots?: Readonly<Record<string, SlotMeta>>;
};

export type DuckMeta = Readonly<Record<string, ComponentMeta>>;

export const getSlotMeta = (
  meta: DuckMeta | undefined,
  type: string,
  slotKey: string,
): SlotMeta | undefined => meta?.[type]?.slots?.[slotKey];

export const isSlotOptional = (
  meta: DuckMeta | undefined,
  type: string,
  slotKey: string,
): boolean => getSlotMeta(meta, type, slotKey)?.optional === true;
