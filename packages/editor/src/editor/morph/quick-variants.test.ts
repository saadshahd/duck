import { describe, it, expect } from "bun:test";
import type { ComponentData, Config } from "@puckeditor/core";
import type { DerivedVariation } from "@duckeditor/spec";
import { quickVariants, withVariant } from "./quick-variants.js";

const makeConfig = (fields: Record<string, unknown>): Config =>
  ({
    components: { Widget: { render: () => null, fields } },
    root: { render: () => null },
  }) as unknown as Config;

const makeElement = (props: Record<string, unknown>): ComponentData => ({
  type: "Widget",
  props: { id: "w1", ...props },
});

const variation = (
  name: string,
  props: Record<string, unknown>,
): DerivedVariation => ({ name, componentType: "Widget", props });

const options = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `o${i}`, value: `o${i}` }));

describe("quickVariants", () => {
  const config = makeConfig({
    tone: { type: "select", options: options(3) },
    mode: { type: "radio", options: options(2) },
    scale: { type: "select", options: options(9) },
    style: { type: "object", objectFields: {} },
    text: { type: "text" },
  });

  it("keeps variations targeting top-level select/radio fields", () => {
    const kept = quickVariants({
      variations: [
        variation("o1", { tone: "o1" }),
        variation("o0", { mode: "o0" }),
      ],
      config,
      element: makeElement({ tone: "o0", mode: "o1" }),
    });
    expect(kept).toEqual([
      variation("o1", { tone: "o1" }),
      variation("o0", { mode: "o0" }),
    ]);
  });

  it("skips the currently-active option value", () => {
    const kept = quickVariants({
      variations: [
        variation("o0", { tone: "o0" }),
        variation("o1", { tone: "o1" }),
      ],
      config,
      element: makeElement({ tone: "o0" }),
    });
    expect(kept).toEqual([variation("o1", { tone: "o1" })]);
  });

  it("drops variations targeting non-enumerable or nested fields", () => {
    const kept = quickVariants({
      variations: [
        variation("nested", { style: { color: "red" } }),
        variation("open", { text: "hello" }),
        variation("unknown", { ghost: true }),
      ],
      config,
      element: makeElement({}),
    });
    expect(kept).toEqual([]);
  });

  it("drops variations from fields with too many options to be a variant knob", () => {
    const kept = quickVariants({
      variations: [variation("o3", { scale: "o3" })],
      config,
      element: makeElement({ scale: "o0" }),
    });
    expect(kept).toEqual([]);
  });

  it("returns empty for a component type absent from the config", () => {
    const kept = quickVariants({
      variations: [variation("o1", { tone: "o1" })],
      config,
      element: { type: "Ghost", props: { id: "g1" } },
    });
    expect(kept).toEqual([]);
  });
});

describe("withVariant", () => {
  it("overrides only the varied field, preserving current props and id", () => {
    const element = makeElement({ tone: "o0", text: "keep me" });
    expect(withVariant(element, variation("o1", { tone: "o1" }))).toEqual({
      type: "Widget",
      props: { id: "w1", tone: "o1", text: "keep me" },
    });
  });

  it("returns a new object, leaving the element untouched", () => {
    const element = makeElement({ tone: "o0" });
    const next = withVariant(element, variation("o1", { tone: "o1" }));
    expect(next).not.toBe(element);
    expect(element.props.tone).toBe("o0");
  });
});
