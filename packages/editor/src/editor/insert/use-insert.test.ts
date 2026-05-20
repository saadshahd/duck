import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { Target } from "../machine/target.js";
import { resolveInsertTarget } from "./use-insert.js";

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const box = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Box",
  props: { id, items },
});

const hero = (
  id: string,
  slots: Record<string, ComponentData[]>,
): ComponentData => ({
  type: "Hero",
  props: { id, ...slots },
});

const data = (content: ComponentData[]): Data => ({
  content,
  root: { props: {} },
});

describe("resolveInsertTarget", () => {
  it("no selection → top-level append", () => {
    const d = data([text("a")]);
    expect(resolveInsertTarget(d, null)).toEqual({
      parentId: null,
      slotKey: null,
    });
  });

  it("element selected, leaf → next sibling", () => {
    const d = data([text("a"), text("b")]);
    expect(resolveInsertTarget(d, Target.element("a"))).toEqual({
      parentId: null,
      slotKey: null,
      index: 1,
    });
  });

  it("element selected, has slots → first slot at end", () => {
    const d = data([box("b", [text("t1")])]);
    expect(resolveInsertTarget(d, Target.element("b"))).toEqual({
      parentId: "b",
      slotKey: "items",
      index: 1,
    });
  });

  it("slot selected → that slot at end", () => {
    const d = data([
      hero("h", { figure: [text("f")], content: [], footer: [] }),
    ]);
    const target = resolveInsertTarget(d, Target.slot("h", "footer"));
    expect(target).toEqual({ parentId: "h", slotKey: "footer", index: 0 });
  });
});
