import { describe, it, expect } from "bun:test";
import type { Field } from "@puckeditor/core";
import { Extension } from "@tiptap/core";
import {
  toolbarActionsFor,
  extensionsFor,
  type RichTextMetadata,
} from "./richtext-config.js";

/** A plain-string field wearing the richtext control, its Tiptap config on
 *  `metadata.tiptap` — the shape the config readers now consume. */
const field = (tiptap: RichTextMetadata = {}): Field =>
  ({ type: "textarea", metadata: { control: "richtext", tiptap } }) as Field;

const ids = (f: Field) => toolbarActionsFor(f).map((a) => a.id);

describe("toolbarActionsFor", () => {
  it("offers the full formatting set when no options constrain it", () => {
    expect(ids(field())).toEqual([
      "bold",
      "italic",
      "strike",
      "heading",
      "bulletList",
      "orderedList",
    ]);
  });

  it("omits a member the field disabled with `false`", () => {
    expect(ids(field({ options: { bold: false } }))).toEqual([
      "italic",
      "strike",
      "heading",
      "bulletList",
      "orderedList",
    ]);
  });

  it("omits every member the field disabled", () => {
    const f = field({ options: { strike: false, orderedList: false } });
    expect(ids(f)).toEqual(["bold", "italic", "heading", "bulletList"]);
  });

  it("keeps a member the field merely configures (object, not false)", () => {
    // `{ heading: { levels: [1, 2] } }` narrows heading levels but does not
    // disable it — the button must remain.
    expect(ids(field({ options: { heading: { levels: [1, 2] } } }))).toContain(
      "heading",
    );
  });
});

const placeholderOf = (f: Field) =>
  extensionsFor(f).find((e) => e.name === "placeholder")?.options.placeholder;

describe("extensionsFor", () => {
  it("returns StarterKit + Placeholder for a bare field", () => {
    expect(extensionsFor(field())).toHaveLength(2);
  });

  it("appends catalog-supplied extensions after the built-ins", () => {
    const extra = Extension.create({ name: "catalogExtra" });
    const result = extensionsFor(field({ extensions: [extra] }));
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(extra);
  });

  it("defaults the placeholder when the field sets none", () => {
    expect(placeholderOf(field())).toBe("Add text…");
  });

  it("uses the field's placeholder override when present", () => {
    expect(placeholderOf(field({ placeholder: "Add a note…" }))).toBe(
      "Add a note…",
    );
  });
});
