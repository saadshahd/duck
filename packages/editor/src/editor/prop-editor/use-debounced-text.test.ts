import { describe, it, expect } from "bun:test";
import { TextDraft, shouldFlushOnEnter } from "./use-debounced-text.js";

describe("TextDraft.display", () => {
  it("committed → the stored value (external updates show through)", () => {
    expect(TextDraft.display(TextDraft.committed, "stored")).toBe("stored");
  });

  it("committed → a changed stored value, not any prior text", () => {
    expect(TextDraft.display(TextDraft.committed, "agent-pushed")).toBe(
      "agent-pushed",
    );
  });

  it("drafting → the draft text even when stored differs", () => {
    expect(TextDraft.display(TextDraft.edit("typing…"), "agent-pushed")).toBe(
      "typing…",
    );
  });

  it("drafting → an empty draft (clearing a field is a real draft)", () => {
    expect(TextDraft.display(TextDraft.edit(""), "stored")).toBe("");
  });
});

describe("TextDraft.edit", () => {
  it("produces a drafting state carrying the text", () => {
    expect(TextDraft.edit("abc")).toEqual({ status: "drafting", text: "abc" });
  });
});

describe("shouldFlushOnEnter", () => {
  const key = (overrides: {
    key: string;
    tagName?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
  }) => ({
    key: overrides.key,
    metaKey: overrides.metaKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    currentTarget: { tagName: overrides.tagName ?? "INPUT" },
  });

  it("Enter in an input flushes", () => {
    expect(shouldFlushOnEnter(key({ key: "Enter" }))).toBe(true);
  });

  it("non-Enter keys never flush", () => {
    expect(shouldFlushOnEnter(key({ key: "a" }))).toBe(false);
    expect(shouldFlushOnEnter(key({ key: "Escape" }))).toBe(false);
  });

  it("plain Enter in a textarea does not flush (it inserts a newline)", () => {
    expect(shouldFlushOnEnter(key({ key: "Enter", tagName: "TEXTAREA" }))).toBe(
      false,
    );
  });

  it("Cmd/Ctrl+Enter in a textarea flushes", () => {
    expect(
      shouldFlushOnEnter(
        key({ key: "Enter", tagName: "TEXTAREA", metaKey: true }),
      ),
    ).toBe(true);
    expect(
      shouldFlushOnEnter(
        key({ key: "Enter", tagName: "TEXTAREA", ctrlKey: true }),
      ),
    ).toBe(true);
  });
});

describe("TextDraft.committed", () => {
  it("is referentially stable (setState bail on repeat flushes)", () => {
    expect(TextDraft.committed).toBe(TextDraft.committed);
  });
});
