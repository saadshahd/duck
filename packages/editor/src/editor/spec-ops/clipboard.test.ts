import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import {
  serializeFragment,
  deserializeFragment,
  insertFragment,
  duplicate,
  type SpecFragment,
} from "./clipboard.js";

// --- Factories ---

const nested = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["container", "footer"] },
    container: { type: "Stack", props: {}, children: ["heading", "text"] },
    heading: { type: "Heading", props: { text: "Hello" } },
    text: { type: "Text", props: { text: "World" } },
    footer: { type: "Text", props: { text: "Footer" } },
  },
});

const flat = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b", "c"] },
    a: { type: "Text", props: { text: "A" } },
    b: { type: "Text", props: { text: "B" } },
    c: { type: "Text", props: { text: "C" } },
  },
});

const fragment = (overrides?: Partial<SpecFragment>): SpecFragment => ({
  _type: "json-render-fragment",
  root: "item",
  elements: {
    item: { type: "Stack", props: {}, children: ["child"] },
    child: { type: "Text", props: { text: "Child" } },
  },
  ...overrides,
});

// --- serializeFragment ---

describe("serializeFragment", () => {
  it("extracts a leaf element", () => {
    const result = serializeFragment(flat(), "b");
    expect(result.isOk()).toBe(true);
    const frag = result._unsafeUnwrap();
    expect(frag._type).toBe("json-render-fragment");
    expect(frag.root).toBe("b");
    expect(Object.keys(frag.elements)).toEqual(["b"]);
    expect(frag.elements.b.props).toEqual({ text: "B" });
  });

  it("extracts a subtree with all descendants", () => {
    const result = serializeFragment(nested(), "container");
    const frag = result._unsafeUnwrap();
    expect(frag.root).toBe("container");
    expect(new Set(Object.keys(frag.elements))).toEqual(
      new Set(["container", "heading", "text"]),
    );
    expect(frag.elements.container.children).toEqual(["heading", "text"]);
  });

  it("does not include sibling or ancestor elements", () => {
    const frag = serializeFragment(nested(), "container")._unsafeUnwrap();
    expect(frag.elements).not.toHaveProperty("page");
    expect(frag.elements).not.toHaveProperty("footer");
  });

  it("fails for nonexistent element", () => {
    const result = serializeFragment(flat(), "zzz");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});

// --- deserializeFragment ---

describe("deserializeFragment", () => {
  it("remaps all IDs to type-based names", () => {
    const frag = fragment();
    const result = deserializeFragment(frag, new Set());
    expect(result.root).toBe("stack-1");
    expect(Object.keys(result.elements)).toContain("stack-1");
    expect(Object.keys(result.elements)).toContain("text-1");
  });

  it("remaps children arrays to new IDs", () => {
    const result = deserializeFragment(fragment(), new Set());
    expect(result.elements["stack-1"].children).toEqual(["text-1"]);
  });

  it("avoids collisions with existingIds", () => {
    const result = deserializeFragment(
      fragment(),
      new Set(["stack-1", "text-1"]),
    );
    expect(result.root).toBe("stack-2");
    expect(result.elements["stack-2"].children).toEqual(["text-2"]);
  });

  it("avoids collisions between IDs generated in the same batch", () => {
    const frag: SpecFragment = {
      _type: "json-render-fragment",
      root: "a",
      elements: {
        a: { type: "Text", props: { text: "1" } },
        b: { type: "Text", props: { text: "2" } },
        c: { type: "Text", props: { text: "3" } },
      },
    };
    const result = deserializeFragment(frag, new Set());
    const ids = Object.keys(result.elements);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain("text-1");
    expect(ids).toContain("text-2");
    expect(ids).toContain("text-3");
  });

  it("preserves props without mutation", () => {
    const frag = fragment();
    const result = deserializeFragment(frag, new Set());
    expect(result.elements["text-1"].props).toEqual({ text: "Child" });
  });

  it("preserves _type marker", () => {
    const result = deserializeFragment(fragment(), new Set());
    expect(result._type).toBe("json-render-fragment");
  });

  it("does not add children to childless elements", () => {
    const result = deserializeFragment(fragment(), new Set());
    expect(result.elements["text-1"]).not.toHaveProperty("children");
  });
});

// --- insertFragment ---

describe("insertFragment", () => {
  it("inserts fragment after the target element", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const result = insertFragment(flat(), frag, "a");
    expect(result.isOk()).toBe(true);
    const s = result._unsafeUnwrap();
    expect(s.elements.page.children).toEqual(["a", "stack-1", "b", "c"]);
  });

  it("merges fragment elements into spec", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const s = insertFragment(flat(), frag, "a")._unsafeUnwrap();
    expect(s.elements).toHaveProperty("stack-1");
    expect(s.elements).toHaveProperty("text-1");
    expect(s.elements["text-1"].props).toEqual({ text: "Child" });
  });

  it("inserts after the last element", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const s = insertFragment(flat(), frag, "c")._unsafeUnwrap();
    expect(s.elements.page.children).toEqual(["a", "b", "c", "stack-1"]);
  });

  it("returns immutable result", () => {
    const original = flat();
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(original.elements)),
    );
    const s = insertFragment(original, frag, "a")._unsafeUnwrap();
    expect(s).not.toBe(original);
    expect(original.elements.page.children).toEqual(["a", "b", "c"]);
  });

  it("fails for nonexistent afterElementId", () => {
    const frag = deserializeFragment(fragment(), new Set());
    const result = insertFragment(flat(), frag, "zzz");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("parent-not-found");
  });
});

// --- duplicate ---

describe("duplicate", () => {
  it("duplicates a leaf element after itself", () => {
    const result = duplicate(flat(), "b");
    expect(result.isOk()).toBe(true);
    const { spec, newRootId } = result._unsafeUnwrap();
    expect(spec.elements.page.children).toEqual(["a", "b", newRootId, "c"]);
    expect(spec.elements[newRootId].type).toBe("Text");
    expect(spec.elements[newRootId].props).toEqual({ text: "B" });
  });

  it("duplicates a subtree with all descendants", () => {
    const result = duplicate(nested(), "container");
    const { spec, newRootId } = result._unsafeUnwrap();
    expect(spec.elements.page.children).toEqual([
      "container",
      newRootId,
      "footer",
    ]);
    const newChildren = spec.elements[newRootId].children!;
    expect(newChildren).toHaveLength(2);
    expect(spec.elements[newChildren[0]].type).toBe("Heading");
    expect(spec.elements[newChildren[1]].type).toBe("Text");
  });

  it("generates IDs that don't collide with existing elements", () => {
    const { spec } = duplicate(flat(), "a")._unsafeUnwrap();
    const allIds = Object.keys(spec.elements);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("returns immutable result", () => {
    const original = flat();
    const result = duplicate(original, "b");
    expect(result._unsafeUnwrap().spec).not.toBe(original);
    expect(original.elements.page.children).toEqual(["a", "b", "c"]);
  });

  it("fails for root element", () => {
    const result = duplicate(flat(), "page");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("cannot-duplicate-root");
  });

  it("fails for nonexistent element", () => {
    const result = duplicate(flat(), "zzz");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});
