import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { editProp } from "./edit-prop.js";

// --- Factories ---

const spec = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["heading"] },
    heading: {
      type: "Heading",
      props: { text: "Hello", level: "h1" },
    },
  },
});

// --- editProp ---

describe("editProp", () => {
  it("updates a string prop", () => {
    const result = editProp(spec(), "heading", "text", "World");
    expect(result.isOk() && result.value.elements.heading.props.text).toBe(
      "World",
    );
  });

  it("updates an enum prop", () => {
    const result = editProp(spec(), "heading", "level", "h2");
    expect(result.isOk() && result.value.elements.heading.props.level).toBe(
      "h2",
    );
  });

  it("returns new spec (immutable)", () => {
    const original = spec();
    const result = editProp(original, "heading", "text", "New");
    expect(result.isOk() && result.value).not.toBe(original);
    expect(original.elements.heading.props.text).toBe("Hello");
  });

  it("fails for nonexistent element", () => {
    const result = editProp(spec(), "zzz", "text", "x");
    expect(result.isErr() && result.error.tag).toBe("element-not-found");
  });

  it("creates prop when key does not exist", () => {
    const result = editProp(spec(), "heading", "color", "red");
    expect(result.isOk() && result.value.elements.heading.props.color).toBe(
      "red",
    );
  });
});
