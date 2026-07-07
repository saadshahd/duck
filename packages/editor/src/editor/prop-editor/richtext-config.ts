import type { Field } from "@puckeditor/core";
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/** A Puck `richtext` field. Its `options` map one-to-one onto StarterKit's
 *  configuration (`{ bold: false }`, `{ heading: { levels: [1, 2] } }`), and
 *  `tiptap.extensions` appends catalog-supplied extensions — this is the field's
 *  editing contract, the thing that keeps the control honest to the catalog. */
export type RichTextField = Extract<Field, { type: "richtext" }>;

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

const options = (field: RichTextField): Record<string, unknown> =>
  (field.options ?? {}) as Record<string, unknown>;

/** A StarterKit member is enabled unless the field's options set it to `false`
 *  — Puck/StarterKit's own disable convention (`{ bold: false }`). */
const isEnabled = (field: RichTextField, optionKey: string): boolean =>
  options(field)[optionKey] !== false;

/** The formatting actions to show for a field — the honest toolbar. A member the
 *  catalog disabled is absent, never a dead disabled button, so the toolbar can
 *  never offer a mark the stored value's schema forbids. */
export const toolbarActionsFor = (field: RichTextField): RichTextAction[] =>
  RICHTEXT_ACTIONS.filter((action) => isEnabled(field, action.optionKey));

/** The extension set for a field: StarterKit configured from the field's options
 *  (the same options that gate the toolbar), then any catalog-supplied
 *  `tiptap.extensions`. The single source of what the editor may produce. */
export const extensionsFor = (field: RichTextField): Extensions => {
  const extras = (field.tiptap?.extensions ?? []) as Extensions;
  return [
    StarterKit.configure(
      options(field) as Parameters<typeof StarterKit.configure>[0],
    ),
    ...extras,
  ];
};
