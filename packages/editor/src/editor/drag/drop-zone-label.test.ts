import { describe, test, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { resolveContainerId } from "./drop-zone-label.js";

const spec = (children: string[]): Spec => ({
  root: "container",
  elements: {
    container: { type: "Stack", children },
    a: { type: "Heading" },
    b: { type: "Text" },
    c: { type: "Button" },
  },
});

describe("resolveContainerId", () => {
  test("container target returns elementId directly", () => {
    const result = resolveContainerId(spec(["a", "b"]), {
      kind: "container",
      elementId: "container",
    });
    expect(result).toBe("container");
  });

  test("line target returns parent of elementId", () => {
    const result = resolveContainerId(spec(["a", "b", "c"]), {
      kind: "line",
      elementId: "b",
      edge: "bottom",
      axis: "vertical",
    });
    expect(result).toBe("container");
  });

  test("line target with orphan elementId returns null", () => {
    const result = resolveContainerId(spec(["a"]), {
      kind: "line",
      elementId: "orphan",
      edge: "top",
      axis: "vertical",
    });
    expect(result).toBeNull();
  });
});
