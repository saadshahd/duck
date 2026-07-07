import type { Field } from "@puckeditor/core";

type ArrayField = Extract<Field, { type: "array" }>;

export type ArrayItem = Record<string, unknown>;

/** Whether a structural affordance is currently permitted; carries the honest
 *  reason when it is not, so disabled controls can surface it verbatim. */
export type Gate = { allowed: true } | { allowed: false; reason: string };

const allowed: Gate = { allowed: true };

const itemsWord = (n: number): string => (n === 1 ? "item" : "items");

const move = (items: ArrayItem[], from: number, to: number): ArrayItem[] => {
  const isOutOfRange = (i: number) => i < 0 || i >= items.length;
  if (from === to || isOutOfRange(from) || isOutOfRange(to)) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const removeAt = (items: ArrayItem[], index: number): ArrayItem[] =>
  index < 0 || index >= items.length
    ? items
    : items.filter((_, i) => i !== index);

const addGate = (count: number, max?: number): Gate =>
  max === undefined || count < max
    ? allowed
    : { allowed: false, reason: `Maximum ${max} ${itemsWord(max)}` };

const removeGate = (count: number, min?: number): Gate =>
  min === undefined || count > min
    ? allowed
    : { allowed: false, reason: `Minimum ${min} ${itemsWord(min)}` };

const defaults = (field: ArrayField, index: number): ArrayItem => {
  const source =
    typeof field.defaultItemProps === "function"
      ? field.defaultItemProps(index)
      : field.defaultItemProps;
  return source ? (structuredClone(source) as ArrayItem) : {};
};

/** A structural array op, tagged for history-label phrasing. */
export type ArrayOp =
  | { kind: "add" }
  | { kind: "remove" }
  | { kind: "move"; direction: "up" | "down" };

const SUMMARY_MAX = 24;

const truncate = (s: string): string =>
  s.length > SUMMARY_MAX ? `${s.slice(0, SUMMARY_MAX).trimEnd()}…` : s;

const VERB: Record<ArrayOp["kind"], string> = {
  add: "Add",
  remove: "Remove",
  move: "Move",
};

const suffix = (op: ArrayOp): string =>
  op.kind === "move" ? ` ${op.direction}` : "";

/** History-entry phrase for a structural op. Names the item by its summary when
 *  present ("Remove 'Feature A'", "Move 'Feature A' up"), else the bare op
 *  ("Remove item"). Long summaries are truncated to fit a timeline label. */
const describe = (op: ArrayOp, summary?: string): string =>
  `${VERB[op.kind]} ${summary ? `'${truncate(summary)}'` : "item"}${suffix(op)}`;

/** A single-field item renders its one field inline — the row IS the field, no
 *  disclosure. Two or more fields render behind a disclosure. */
const isInlineRow = (arrayFields: Record<string, Field>): boolean =>
  Object.keys(arrayFields).length === 1;

export const ArrayItems = {
  move,
  removeAt,
  addGate,
  removeGate,
  defaults,
  describe,
  isInlineRow,
} as const;
