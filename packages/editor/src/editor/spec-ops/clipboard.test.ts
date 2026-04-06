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
  roots: ["item"],
  elements: {
    item: { type: "Stack", props: {}, children: ["child"] },
    child: { type: "Text", props: { text: "Child" } },
  },
  ...overrides,
});

// --- serializeFragment ---

describe("serializeFragment", () => {
  it("extracts a leaf element", () => {
    const result = serializeFragment(flat(), new Set(["b"]));
    expect(result.isOk()).toBe(true);
    const frag = result._unsafeUnwrap();
    expect(frag._type).toBe("json-render-fragment");
    expect(frag.roots).toEqual(["b"]);
    expect(Object.keys(frag.elements)).toEqual(["b"]);
    expect(frag.elements.b.props).toEqual({ text: "B" });
  });

  it("extracts a subtree with all descendants", () => {
    const result = serializeFragment(nested(), new Set(["container"]));
    const frag = result._unsafeUnwrap();
    expect(frag.roots).toEqual(["container"]);
    expect(new Set(Object.keys(frag.elements))).toEqual(
      new Set(["container", "heading", "text"]),
    );
    expect(frag.elements.container.children).toEqual(["heading", "text"]);
  });

  it("does not include sibling or ancestor elements", () => {
    const frag = serializeFragment(
      nested(),
      new Set(["container"]),
    )._unsafeUnwrap();
    expect(frag.elements).not.toHaveProperty("page");
    expect(frag.elements).not.toHaveProperty("footer");
  });

  it("fails for nonexistent element", () => {
    const result = serializeFragment(flat(), new Set(["zzz"]));
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });

  it("serializes multiple siblings in tree order", () => {
    const frag = serializeFragment(flat(), new Set(["c", "a"]))._unsafeUnwrap();
    expect(frag.roots).toEqual(["a", "c"]);
    expect(Object.keys(frag.elements).sort()).toEqual(["a", "c"]);
  });

  it("deduplicates parent+child to parent only", () => {
    const frag = serializeFragment(
      nested(),
      new Set(["container", "heading"]),
    )._unsafeUnwrap();
    expect(frag.roots).toEqual(["container"]);
    expect(frag.elements).toHaveProperty("heading");
  });

  it("serializes elements from different branches", () => {
    const frag = serializeFragment(
      nested(),
      new Set(["heading", "footer"]),
    )._unsafeUnwrap();
    expect(frag.roots).toEqual(["heading", "footer"]);
  });
});

// --- deserializeFragment ---

describe("deserializeFragment", () => {
  it("remaps all IDs to type-based names", () => {
    const frag = fragment();
    const result = deserializeFragment(frag, new Set());
    expect(result.roots).toEqual(["stack-1"]);
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
    expect(result.roots).toEqual(["stack-2"]);
    expect(result.elements["stack-2"].children).toEqual(["text-2"]);
  });

  it("avoids collisions between IDs generated in the same batch", () => {
    const frag: SpecFragment = {
      _type: "json-render-fragment",
      roots: ["a"],
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

  it("remaps multiple roots", () => {
    const frag: SpecFragment = {
      _type: "json-render-fragment",
      roots: ["x", "y"],
      elements: {
        x: { type: "Heading", props: { text: "X" } },
        y: { type: "Text", props: { text: "Y" } },
      },
    };
    const result = deserializeFragment(frag, new Set());
    expect(result.roots).toEqual(["heading-1", "text-1"]);
  });
});

// --- insertFragment ---

describe("insertFragment — after", () => {
  const after = { tag: "after" as const };

  it("inserts as sibling after a leaf element", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const s = insertFragment(flat(), frag, "a", after)._unsafeUnwrap();
    expect(s.elements.page.children).toEqual(["a", "stack-1", "b", "c"]);
  });

  it("inserts as sibling after the last element", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const s = insertFragment(flat(), frag, "c", after)._unsafeUnwrap();
    expect(s.elements.page.children).toEqual(["a", "b", "c", "stack-1"]);
  });

  it("merges fragment elements into spec", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const s = insertFragment(flat(), frag, "a", after)._unsafeUnwrap();
    expect(s.elements).toHaveProperty("stack-1");
    expect(s.elements).toHaveProperty("text-1");
    expect(s.elements["text-1"].props).toEqual({ text: "Child" });
  });

  it("inserts multiple roots as siblings after target", () => {
    const frag: SpecFragment = {
      _type: "json-render-fragment",
      roots: ["heading-1", "text-1"],
      elements: {
        "heading-1": { type: "Heading", props: { text: "H" } },
        "text-1": { type: "Text", props: { text: "T" } },
      },
    };
    const s = insertFragment(flat(), frag, "a", after)._unsafeUnwrap();
    expect(s.elements.page.children).toEqual([
      "a",
      "heading-1",
      "text-1",
      "b",
      "c",
    ]);
  });
});

describe("insertFragment — child", () => {
  const child = { tag: "child" as const };

  it("appends as last child of a container", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(nested().elements)),
    );
    const s = insertFragment(
      nested(),
      frag,
      "container",
      child,
    )._unsafeUnwrap();
    expect(s.elements.container.children).toEqual([
      "heading",
      "text",
      "stack-1",
    ]);
  });

  it("appends into root when root is the target", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(flat().elements)),
    );
    const s = insertFragment(flat(), frag, "page", child)._unsafeUnwrap();
    expect(s.elements.page.children).toEqual(["a", "b", "c", "stack-1"]);
  });

  it("merges fragment elements into spec", () => {
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(nested().elements)),
    );
    const s = insertFragment(
      nested(),
      frag,
      "container",
      child,
    )._unsafeUnwrap();
    expect(s.elements).toHaveProperty("stack-1");
    expect(s.elements["text-1"].props).toEqual({ text: "Child" });
  });

  it("fails when target has no children", () => {
    const frag = deserializeFragment(fragment(), new Set());
    const result = insertFragment(flat(), frag, "a", child);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("no-children");
  });

  it("appends multiple roots as children", () => {
    const frag: SpecFragment = {
      _type: "json-render-fragment",
      roots: ["heading-1", "text-1"],
      elements: {
        "heading-1": { type: "Heading", props: { text: "H" } },
        "text-1": { type: "Text", props: { text: "T" } },
      },
    };
    const s = insertFragment(flat(), frag, "page", child)._unsafeUnwrap();
    expect(s.elements.page.children).toEqual([
      "a",
      "b",
      "c",
      "heading-1",
      "text-1",
    ]);
  });
});

describe("insertFragment — immutability and errors", () => {
  it("returns immutable result", () => {
    const original = flat();
    const frag = deserializeFragment(
      fragment(),
      new Set(Object.keys(original.elements)),
    );
    const s = insertFragment(original, frag, "a", {
      tag: "after",
    })._unsafeUnwrap();
    expect(s).not.toBe(original);
    expect(original.elements.page.children).toEqual(["a", "b", "c"]);
  });

  it("fails for nonexistent target with after", () => {
    const frag = deserializeFragment(fragment(), new Set());
    const result = insertFragment(flat(), frag, "zzz", { tag: "after" });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("parent-not-found");
  });

  it("fails for nonexistent target with child", () => {
    const frag = deserializeFragment(fragment(), new Set());
    const result = insertFragment(flat(), frag, "zzz", { tag: "child" });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});

// --- duplicate ---

describe("duplicate", () => {
  it("duplicates a leaf element after itself", () => {
    const result = duplicate(flat(), new Set(["b"]));
    expect(result.isOk()).toBe(true);
    const { spec, newRootIds } = result._unsafeUnwrap();
    expect(newRootIds).toHaveLength(1);
    expect(spec.elements.page.children).toEqual(["a", "b", newRootIds[0], "c"]);
    expect(spec.elements[newRootIds[0]].type).toBe("Text");
    expect(spec.elements[newRootIds[0]].props).toEqual({ text: "B" });
  });

  it("duplicates a subtree with all descendants", () => {
    const result = duplicate(nested(), new Set(["container"]));
    const { spec, newRootIds } = result._unsafeUnwrap();
    expect(spec.elements.page.children).toEqual([
      "container",
      newRootIds[0],
      "footer",
    ]);
    const newChildren = spec.elements[newRootIds[0]].children!;
    expect(newChildren).toHaveLength(2);
    expect(spec.elements[newChildren[0]].type).toBe("Heading");
    expect(spec.elements[newChildren[1]].type).toBe("Text");
  });

  it("generates IDs that don't collide with existing elements", () => {
    const { spec } = duplicate(flat(), new Set(["a"]))._unsafeUnwrap();
    const allIds = Object.keys(spec.elements);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("returns immutable result", () => {
    const original = flat();
    const result = duplicate(original, new Set(["b"]));
    expect(result._unsafeUnwrap().spec).not.toBe(original);
    expect(original.elements.page.children).toEqual(["a", "b", "c"]);
  });

  it("fails for root element", () => {
    const result = duplicate(flat(), new Set(["page"]));
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("cannot-duplicate-root");
  });

  it("fails for nonexistent element", () => {
    const result = duplicate(flat(), new Set(["zzz"]));
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });

  it("duplicates multiple siblings in-place", () => {
    const { spec, newRootIds } = duplicate(
      flat(),
      new Set(["a", "c"]),
    )._unsafeUnwrap();
    expect(newRootIds).toHaveLength(2);
    // Each duplicate appears after its original
    expect(spec.elements.page.children).toEqual([
      "a",
      newRootIds[0],
      "b",
      "c",
      newRootIds[1],
    ]);
  });

  it("deduplicates parent+child to parent only", () => {
    const { spec, newRootIds } = duplicate(
      nested(),
      new Set(["container", "heading"]),
    )._unsafeUnwrap();
    expect(newRootIds).toHaveLength(1);
    expect(spec.elements.page.children).toEqual([
      "container",
      newRootIds[0],
      "footer",
    ]);
  });
});
