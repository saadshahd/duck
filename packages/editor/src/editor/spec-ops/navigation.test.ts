import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { nextInTreeOrder } from "./navigation.js";

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: id },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

// Pre-order: outer, head, body, b1, b2, foot
const data: Data = {
  root: { props: {} },
  content: [
    stack("outer", [
      text("head"),
      stack("body", [text("b1"), text("b2")]),
      text("foot"),
    ]),
  ],
};

describe("nextInTreeOrder — forward", () => {
  it("walks into the first child of a parent", () => {
    expect(nextInTreeOrder(data, "outer", "forward")).toBe("head");
  });

  it("moves to next sibling", () => {
    expect(nextInTreeOrder(data, "head", "forward")).toBe("body");
  });

  it("descends into a slot", () => {
    expect(nextInTreeOrder(data, "body", "forward")).toBe("b1");
  });

  it("crosses out of a slot to uncle", () => {
    expect(nextInTreeOrder(data, "b2", "forward")).toBe("foot");
  });

  it("returns null at document end", () => {
    expect(nextInTreeOrder(data, "foot", "forward")).toBeNull();
  });
});

describe("nextInTreeOrder — backward", () => {
  it("returns null before first element", () => {
    expect(nextInTreeOrder(data, "outer", "backward")).toBeNull();
  });

  it("moves to previous sibling", () => {
    expect(nextInTreeOrder(data, "b2", "backward")).toBe("b1");
  });

  it("crosses up to parent's tail", () => {
    expect(nextInTreeOrder(data, "foot", "backward")).toBe("b2");
  });

  it("first child returns parent", () => {
    expect(nextInTreeOrder(data, "head", "backward")).toBe("outer");
  });
});

describe("nextInTreeOrder — unknown id", () => {
  it("returns null", () => {
    expect(nextInTreeOrder(data, "zzz", "forward")).toBeNull();
    expect(nextInTreeOrder(data, "zzz", "backward")).toBeNull();
  });
});

describe("nextInTreeOrder — full walk", () => {
  it("forward visits every element in pre-order", () => {
    const visited: string[] = ["outer"];
    let current: string | null = "outer";
    for (let i = 0; i < 20; i++) {
      const next = nextInTreeOrder(data, current!, "forward");
      if (next === null) break;
      visited.push(next);
      current = next;
    }
    expect(visited).toEqual(["outer", "head", "body", "b1", "b2", "foot"]);
  });
});
