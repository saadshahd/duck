import { describe, it, expect } from "bun:test";
import { TextDraft } from "./use-debounced-text.js";

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

describe("TextDraft.committed", () => {
  it("is referentially stable (setState bail on repeat flushes)", () => {
    expect(TextDraft.committed).toBe(TextDraft.committed);
  });
});
