import { describe, it, expect } from "bun:test";
import { hasSingleTextNode } from "./has-single-text-node.js";

const el = (html: string): HTMLElement => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
};

describe("hasSingleTextNode", () => {
  it("returns true for a single text node", () => {
    expect(hasSingleTextNode(el("<span>hello</span>"))).toBeTruthy();
  });

  it("returns false when multiple non-empty text nodes exist", () => {
    expect(hasSingleTextNode(el("<h1>Title</h1><p>Sub</p>"))).toBeFalsy();
  });

  it("returns false when the element has only whitespace text nodes", () => {
    expect(hasSingleTextNode(el("   "))).toBeFalsy();
  });

  it("ignores whitespace-only text nodes when counting", () => {
    expect(hasSingleTextNode(el("<span>  </span><span>text</span>"))).toBe(
      true,
    );
  });

  it("returns false when there are two non-empty sibling text nodes", () => {
    expect(hasSingleTextNode(el("<span>A</span><span>B</span>"))).toBeFalsy();
  });

  it("returns true for a deeply nested single text node", () => {
    expect(hasSingleTextNode(el("<div><p><span>deep</span></p></div>"))).toBe(
      true,
    );
  });
});
