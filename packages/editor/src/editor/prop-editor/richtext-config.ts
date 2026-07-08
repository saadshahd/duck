import type { Field } from "@puckeditor/core";
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

/** Muted prompt shown in an empty editor. Catalog-agnostic default — a catalog
 *  tunes it per field via `metadata.tiptap.placeholder`. */
const DEFAULT_PLACEHOLDER = "Add text…";

/** The richtext control's Tiptap config, carried on a field's `metadata.tiptap`.
 *  Puck's native `richtext` field element-izes its value and can't round-trip
 *  Duck's HTML-string contract, so the control rides on a plain-string field (the
 *  demo uses `textarea`) tagged `metadata.control: "richtext"`, with its config
 *  here. `options` map one-to-one onto StarterKit config (`{ bold: false }`,
 *  `{ heading: { levels: [1, 2] } }`); `extensions` append catalog-supplied
 *  extensions — together the field's editing contract, the thing that keeps the
 *  control honest to the catalog. */
export type RichTextMetadata = {
  options?: Record<string, unknown>;
  extensions?: Extensions;
  placeholder?: string;
};

/** Read the richtext config off a field's `metadata.tiptap`. The cast is local and
 *  explicit — Puck types `metadata` as an open string map — and absent config
 *  yields the empty options: the full default toolbar and bare StarterKit. */
const meta = (field: Field): RichTextMetadata =>
  (field as { metadata?: { tiptap?: RichTextMetadata } }).metadata?.tiptap ??
  {};

/** A formatting control the sheet toolbar can offer. `optionKey` is the
 *  StarterKit option that governs it, so the same key both disables the schema
 *  mark/node (`extensionsFor`) and hides the button (`toolbarActionsFor`). */
export type RichTextActionId =
  "bold" | "italic" | "strike" | "heading" | "bulletList" | "orderedList";

export type RichTextAction = {
  id: RichTextActionId;
  label: string;
  optionKey: string;
};

/** The full formatting set a focus-sheet richtext control offers — a deliberately
 *  thin, single-click subset of StarterKit (no link/media chrome; this is a
 *  review-and-steer surface, not a full CMS). Order is toolbar order. */
export const RICHTEXT_ACTIONS: readonly RichTextAction[] = [
  { id: "bold", label: "Bold", optionKey: "bold" },
  { id: "italic", label: "Italic", optionKey: "italic" },
  { id: "strike", label: "Strikethrough", optionKey: "strike" },
  { id: "heading", label: "Heading", optionKey: "heading" },
  { id: "bulletList", label: "Bulleted list", optionKey: "bulletList" },
  { id: "orderedList", label: "Numbered list", optionKey: "orderedList" },
];

const options = (field: Field): Record<string, unknown> =>
  meta(field).options ?? {};

/** A StarterKit member is enabled unless the field's options set it to `false`
 *  — Puck/StarterKit's own disable convention (`{ bold: false }`). */
const isEnabled = (field: Field, optionKey: string): boolean =>
  options(field)[optionKey] !== false;

/** The formatting actions to show for a field — the honest toolbar. A member the
 *  catalog disabled is absent, never a dead disabled button, so the toolbar can
 *  never offer a mark the stored value's schema forbids. */
export const toolbarActionsFor = (field: Field): RichTextAction[] =>
  RICHTEXT_ACTIONS.filter((action) => isEnabled(field, action.optionKey));

/** The extension set for a field: StarterKit configured from the field's options
 *  (the same options that gate the toolbar), then any catalog-supplied
 *  `extensions`. The single source of what the editor may produce. */
export const extensionsFor = (field: Field): Extensions => [
  StarterKit.configure(
    options(field) as Parameters<typeof StarterKit.configure>[0],
  ),
  Placeholder.configure({
    placeholder: meta(field).placeholder ?? DEFAULT_PLACEHOLDER,
  }),
  ...(meta(field).extensions ?? []),
];
