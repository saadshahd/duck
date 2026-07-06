import { describe, it, expect } from "bun:test";
import { hasSingleTextNode, findTextHost } from "./has-single-text-node.js";

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

describe("findTextHost", () => {
  it("returns the element owning a nested text node", () => {
    const root = el("<p>npm install</p>");
    expect(findTextHost(root)).toBe(root.querySelector("p") as HTMLElement);
  });

  it("returns the deepest owner for deeply nested text", () => {
    const root = el("<div><p><span>deep</span></p></div>");
    expect(findTextHost(root)).toBe(root.querySelector("span") as HTMLElement);
  });

  it("returns the element itself when it owns the text node directly", () => {
    const root = el("hello");
    expect(findTextHost(root)).toBe(root);
  });

  it("falls back to the element when no single text node exists", () => {
    const root = el("<span>A</span><span>B</span>");
    expect(findTextHost(root)).toBe(root);
  });
});
