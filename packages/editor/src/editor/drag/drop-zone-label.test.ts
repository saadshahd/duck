import { describe, test, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { resolveContainerId, resolveLabel } from "./drop-zone-label.js";

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
        slotKey: "items",
        index: 1,
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

describe("resolveLabel", () => {
  test("container target → 'Component › slot'", () => {
    expect(
      resolveLabel(data([leaf("a")]), {
        kind: "container",
        elementId: "container",
        slotKey: "items",
        index: 1,
      }),
    ).toBe("Stack › items");
  });

  test("line target → parent component type", () => {
    expect(
      resolveLabel(data([leaf("a"), leaf("b")]), {
        kind: "line",
        elementId: "b",
        edge: "bottom",
        axis: "vertical",
      }),
    ).toBe("Stack");
  });

  test("unknown container → null", () => {
    expect(
      resolveLabel(data([leaf("a")]), {
        kind: "container",
        elementId: "gone",
        slotKey: "items",
        index: 0,
      }),
    ).toBeNull();
  });

  test("orphan line target → null", () => {
    expect(
      resolveLabel(data([leaf("a")]), {
        kind: "line",
        elementId: "orphan",
        edge: "top",
        axis: "vertical",
      }),
    ).toBeNull();
  });
});
