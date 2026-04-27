import { describe, it, expect } from "bun:test";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { update } from "./update.js";
import { findById } from "./helpers.js";

const config = {
  components: {
    Heading: {
      defaultProps: { text: "Untitled", level: "h1" },
    },
    Stack: { defaultProps: { items: [] } },
  },
} as unknown as Config;

const sample = (): Data => ({
  root: { props: {} },
  content: [
    {
      type: "Stack",
      props: {
        id: "s1",
        items: [
          {
            type: "Heading",
            props: { id: "h1", text: "Hello", level: "h2" },
          } as ComponentData,
        ],
      },
    } as ComponentData,
  ],
});

describe("update", () => {
  it("replaces props but preserves id", () => {
    const result = update(sample(), "h1", { text: "World" }, config);
    const next = findById(result._unsafeUnwrap(), "h1")!;
    expect(next.props.text).toBe("World");
    expect(next.props.id).toBe("h1");
  });

  it("reapplies defaults for unspecified props", () => {
    const result = update(sample(), "h1", { text: "World" }, config);
    const next = findById(result._unsafeUnwrap(), "h1")!;
    // level falls back to default since caller didn't supply it
    expect(next.props.level).toBe("h1");
  });

  it("replaces semantics: omitted props are dropped (replaced by defaults)", () => {
    const result = update(sample(), "h1", {}, config);
    const next = findById(result._unsafeUnwrap(), "h1")!;
    expect(next.props).toEqual({ text: "Untitled", level: "h1", id: "h1" });
  });

  it("does not mutate the original", () => {
    const original = sample();
    update(original, "h1", { text: "X" }, config);
    expect(findById(original, "h1")!.props.text).toBe("Hello");
  });

  it("returns new Data reference", () => {
    const original = sample();
    const result = update(original, "h1", { text: "X" }, config);
    expect(result._unsafeUnwrap()).not.toBe(original);
  });

  it("updates a top-level component", () => {
    const result = update(sample(), "s1", { items: [] }, config);
    const next = findById(result._unsafeUnwrap(), "s1")!;
    expect(next.props.items).toEqual([]);
    expect(next.props.id).toBe("s1");
  });

  it("element-not-found for missing id", () => {
    const result = update(sample(), "zzz", { text: "X" }, config);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().tag).toBe("element-not-found");
  });
});
