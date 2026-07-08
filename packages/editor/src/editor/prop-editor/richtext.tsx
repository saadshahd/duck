import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor,
} from "@tiptap/react";
import { FieldLabel, fieldClass } from "./field-shell.js";
import { toDisplayLabel } from "./field-label.js";
import { useDebouncedCommit } from "./use-debounced-text.js";
import {
  extensionsFor,
  toolbarActionsFor,
  type RichTextAction,
  type RichTextActionId,
} from "./richtext-config.js";
import type { Field } from "@puckeditor/core";
import type { FieldProps } from "./puck-fields.js";
import { useShadowSheet } from "../overlay/index.js";
import css from "./richtext.css?inline";

/** The single heading level the toolbar toggles. A focus-sheet richtext control
 *  is for emphasis and structure, not a document outline, so one level suffices. */
const HEADING_LEVEL = 2;

/** Editor-bound behaviour per formatting action, keyed by the same id the pure
 *  `RICHTEXT_ACTIONS` corpus uses. Typed as a total `Record`, so adding an action
 *  id without its editor operations is a compile error. Commands address marks
 *  and nodes by name through the stable core API (`toggleMark`/`toggleNode`/
 *  `toggleList`) rather than the per-extension typed commands, so the control
 *  stays catalog-agnostic and free of extension type-augmentation coupling. Each
 *  runs on `chain().focus()` so it applies to (and restores) the live selection. */
const OPS: Record<
  RichTextActionId,
  { isActive: (e: Editor) => boolean; run: (e: Editor) => void }
> = {
  bold: {
    isActive: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleMark("bold").run(),
  },
  italic: {
    isActive: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleMark("italic").run(),
  },
  strike: {
    isActive: (e) => e.isActive("strike"),
    run: (e) => e.chain().focus().toggleMark("strike").run(),
  },
  heading: {
    isActive: (e) => e.isActive("heading", { level: HEADING_LEVEL }),
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNode("heading", "paragraph", { level: HEADING_LEVEL })
        .run(),
  },
  bulletList: {
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleList("bulletList", "listItem").run(),
  },
  orderedList: {
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleList("orderedList", "listItem").run(),
  },
};

/** One pictographic stroke icon per action — a single unified metaphor across the
 *  toolbar (the audit flagged the old B/I/S/H letters mixed with •/1. symbols).
 *  Drawn on a 24-grid, rendered small; `currentColor` follows the button's state
 *  colour. The full action name stays the aria-label. */
const ICON_D: Record<RichTextActionId, string> = {
  bold: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
  italic: "M19 4h-9 M14 20H5 M15 4 9 20",
  strike: "M16 4H9a3 3 0 0 0-2.83 4 M14 12a4 4 0 0 1 0 8H6 M4 12h16",
  heading: "M6 12h12 M6 20V4 M18 20V4",
  bulletList: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  orderedList:
    "M10 6h11 M10 12h11 M10 18h11 M4 6h1v4 M4 10h2 M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",
};

const ToolbarIcon = ({ id }: { id: RichTextActionId }): ReactNode => (
  <svg
    className="richtext-icon"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={ICON_D[id]} />
  </svg>
);

function Toolbar({
  editor,
  actions,
}: {
  editor: Editor;
  actions: RichTextAction[];
}): ReactNode {
  // Subscribe only to the active-mark slice so button state tracks the selection
  // without re-rendering the editor on every transaction.
  const active = useEditorState({
    editor,
    selector: ({ editor }): Record<string, boolean> =>
      Object.fromEntries(
        actions.map((a) => [a.id, OPS[a.id].isActive(editor)]),
      ),
  });

  return (
    <div
      className="richtext-toolbar"
      role="group"
      aria-label="Text formatting"
      data-role="richtext-toolbar"
    >
      {actions.map((action) => {
        const on = active?.[action.id] ?? false;
        return (
          <button
            key={action.id}
            type="button"
            className="richtext-btn"
            data-role={`richtext-action-${action.id}`}
            aria-label={action.label}
            aria-pressed={on}
            data-active={on || undefined}
            // Mouse-down + preventDefault keeps the editor selection while the
            // button takes the click (the documented Tiptap toolbar pattern),
            // which is what makes formatting work across the shadow-DOM boundary.
            onMouseDown={(e) => {
              e.preventDefault();
              OPS[action.id].run(editor);
            }}
          >
            <ToolbarIcon id={action.id} />
          </button>
        );
      })}
    </div>
  );
}

/** Tiptap serializes an empty document as `<p></p>`; Duck's stored contract is a
 *  plain HTML string where empty means `""`. Canonicalize so Tiptap's on-mount
 *  echo and a user-cleared field both read as the same empty value. */
const canonical = (html: string): string => (html === "<p></p>" ? "" : html);

/** Thin Tiptap richtext control mounted in the focus sheet. Stores a plain HTML
 *  string, configured from the field's `metadata.tiptap`. Commits on the
 *  continuous cadence (debounce + blur), and never overwrites an in-flight edit
 *  when external data changes. */
export const RichTextInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Field, unknown>): ReactNode => {
  useShadowSheet(css);

  const extensions = useMemo(() => extensionsFor(field), [field]);
  const actions = useMemo(() => toolbarActionsFor(field), [field]);
  const { state, push, flush } = useDebouncedCommit((html) => onChange(html));

  // Latest stored value, read fresh in onUpdate to recognise the incoming value
  // regardless of Tiptap's callback-closure timing.
  const valueRef = useRef((value as string) ?? "");
  valueRef.current = (value as string) ?? "";

  const editor = useEditor({
    extensions,
    content: (value as string) ?? "",
    editable: !readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor }) => {
      const next = canonical(editor.getHTML());
      // Skip the echo: Tiptap fires onUpdate with an empty doc on mount, and a
      // reverted edit re-emits the stored value — neither is a new commit.
      if (next === canonical(valueRef.current)) return;
      push(next);
    },
    onBlur: () => flush(),
  });

  useEffect(
    function trackEditable() {
      editor?.setEditable(!readOnly);
    },
    [editor, readOnly],
  );

  useEffect(
    function syncExternalValue() {
      if (!editor) return;
      // An in-flight draft is the designer's uncommitted content — an external
      // data change (agent push, undo, resolve) must never overwrite it.
      if (state.status === "drafting") return;
      const incoming = (value as string) ?? "";
      if (incoming === editor.getHTML()) return;
      if (incoming === "" && editor.isEmpty) return;
      editor.commands.setContent(incoming, { emitUpdate: false });
    },
    [editor, value, state.status],
  );

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
      <div className="richtext" data-role="richtext">
        {editor && !readOnly && <Toolbar editor={editor} actions={actions} />}
        <div className="richtext-content" data-role="richtext-editor">
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  );
};
