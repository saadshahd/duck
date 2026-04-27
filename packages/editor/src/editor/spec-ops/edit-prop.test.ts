import { describe, it, expect } from "bun:test";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { editProp } from "./edit-prop.js";
import { findById } from "./helpers.js";

const config = {
  components: {
    Heading: {
      defaultProps: { text: "Untitled", level: "h1", style: { color: "blue" } },
    },
  },
} as unknown as Config;

const sample = (): Data => ({
  root: { props: {} },
  content: [
    {
      type: "Heading",
      props: {
        id: "h1",
        text: "Hello",
        level: "h2",
        style: { color: "red", weight: 700 },
      },
    } as ComponentData,
  ],
});

describe("editProp", () => {
  it("updates a top-level prop", () => {
    const result = editProp(sample(), "h1", ["text"], "World", config);
    expect(findById(result._unsafeUnwrap(), "h1")!.props.text).toBe("World");
  });

  it("updates a nested prop via path", () => {
    const result = editProp(
      sample(),
      "h1",
      ["style", "color"],
      "green",
      config,
    );
    const next = findById(result._unsafeUnwrap(), "h1")!;
    const style = next.props.style as Record<string, unknown>;
    expect(style.color).toBe("green");
    expect(style.weight).toBe(700);
  });

  it("preserves id", () => {
    const result = editProp(sample(), "h1", ["text"], "X", config);
    expect(findById(result._unsafeUnwrap(), "h1")!.props.id).toBe("h1");
  });

  it("does not mutate the original", () => {
    const original = sample();
    editProp(original, "h1", ["text"], "X", config);
    expect(findById(original, "h1")!.props.text).toBe("Hello");
  });

  it("element-not-found for unknown id", () => {
    const result = editProp(sample(), "zzz", ["text"], "X", config);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});
