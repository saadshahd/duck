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

describe("extensionsFor", () => {
  it("returns StarterKit alone for a bare field", () => {
    expect(extensionsFor(field())).toHaveLength(1);
  });

  it("appends catalog-supplied extensions after StarterKit", () => {
    const extra = Extension.create({ name: "catalogExtra" });
    const result = extensionsFor(field({ extensions: [extra] }));
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(extra);
  });
});
