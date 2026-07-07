import { describe, it, expect } from "bun:test";
import { Extension } from "@tiptap/core";
import {
  toolbarActionsFor,
  extensionsFor,
  type RichTextField,
} from "./richtext-config.js";

const field = (overrides: Record<string, unknown> = {}): RichTextField =>
  ({ type: "richtext", ...overrides }) as RichTextField;

const ids = (f: RichTextField) => toolbarActionsFor(f).map((a) => a.id);

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

  it("appends catalog-supplied tiptap.extensions after StarterKit", () => {
    const extra = Extension.create({ name: "catalogExtra" });
    const result = extensionsFor(field({ tiptap: { extensions: [extra] } }));
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(extra);
  });
});
