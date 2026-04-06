import { describe, test, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { createSelectParent } from "./use-select-parent.js";

const spec = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["section"] },
    section: { type: "Box", props: {}, children: ["item"] },
    item: { type: "Text", props: { text: "Hello" } },
  },
});

const collect = () => {
  const calls: unknown[] = [];
  const send = (e: unknown) => calls.push(e);
  return { calls, send };
};

describe("createSelectParent", () => {
  test("returns undefined when lastSelectedId is null", () => {
    const { send } = collect();
    expect(createSelectParent(spec(), null, send)).toBeUndefined();
  });

  test("returns a function when lastSelectedId is valid", () => {
    const { send } = collect();
    expect(typeof createSelectParent(spec(), "item", send)).toBe("function");
  });

  test("sends SELECT with parent id", () => {
    const { calls, send } = collect();
    createSelectParent(spec(), "item", send)!();
    expect(calls).toEqual([{ type: "SELECT", elementId: "section" }]);
  });

  test("sends SELECT with root for top-level child", () => {
    const { calls, send } = collect();
    createSelectParent(spec(), "section", send)!();
    expect(calls).toEqual([{ type: "SELECT", elementId: "page" }]);
  });

  test("sends DESELECT for orphan element", () => {
    const s: Spec = {
      root: "page",
      elements: {
        page: { type: "Box", props: {}, children: [] },
        orphan: { type: "Text", props: { text: "lost" } },
      },
    };
    const { calls, send } = collect();
    createSelectParent(s, "orphan", send)!();
    expect(calls).toEqual([{ type: "DESELECT" }]);
  });
});
