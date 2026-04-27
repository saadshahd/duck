import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { resolveContainerId } from "./drop-zone-label.js";

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const leaf = (id: string, type = "Text"): ComponentData => ({
  type,
  props: { id },
});

const data = (children: ComponentData[]): Data => ({
  root: { props: {} },
  content: [stack("container", children)],
});

describe("resolveContainerId", () => {
  test("container target returns elementId directly", () => {
    expect(
      resolveContainerId(data([leaf("a")]), {
        kind: "container",
        elementId: "container",
      }),
    ).toBe("container");
  });

  test("line target returns parent of elementId", () => {
    expect(
      resolveContainerId(data([leaf("a"), leaf("b"), leaf("c")]), {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      }),
    ).toBe("container");
  });

  test("line target with orphan elementId returns null", () => {
    expect(
      resolveContainerId(data([leaf("a")]), {
        kind: "line",
        elementId: "orphan",
        edge: "top",
        axis: "vertical",
      }),
    ).toBeNull();
  });
});
