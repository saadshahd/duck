import { describe, expect, it } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { findParentNode } from "./find-parent-node.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as ComponentData;

const heading = make("Heading", "heading");
const body = make("Text", "body");
const card = make("Card", "card", { body: [body] });
const stack = make("Stack", "stack", { items: [heading, card] });

const data: Data = {
  root: { props: {} },
  content: [stack, make("Footer", "footer")],
};

describe("findParentNode", () => {
  it("returns null for top-level nodes", () => {
    expect(findParentNode(data, "stack")).toBeNull();
  });

  it("returns the direct parent component", () => {
    expect(findParentNode(data, "heading")).toBe(stack);
    expect(findParentNode(data, "body")).toBe(card);
  });

  it("returns null for unknown ids", () => {
    expect(findParentNode(data, "nope")).toBeNull();
  });
});
