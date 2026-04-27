import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { preOrder } from "./pre-order.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

const data: Data = {
  root: { props: {} },
  content: [
    make("Stack", "stack", {
      items: [
        make("Heading", "heading"),
        make("Card", "card", { body: [make("Text", "body")] }),
      ],
    }),
    make("Footer", "footer"),
  ],
};

describe("preOrder", () => {
  it("walks parents before children, in declaration order", () => {
    const ids = [...preOrder(data)].map((v) => v.component.props.id);
    expect(ids).toEqual(["stack", "heading", "card", "body", "footer"]);
  });

  it("yields top-level path with null parent and null slot", () => {
    const first = [...preOrder(data)][0];
    expect(first.path).toEqual([{ parentId: null, slotKey: null, index: 0 }]);
  });

  it("yields nested path with parentId and slotKey", () => {
    const visits = [...preOrder(data)];
    const heading = visits.find((v) => v.component.props.id === "heading")!;
    expect(heading.path).toEqual([
      { parentId: null, slotKey: null, index: 0 },
      { parentId: "stack", slotKey: "items", index: 0 },
    ]);
  });

  it("yields deepest path through multiple slots", () => {
    const visits = [...preOrder(data)];
    const body = visits.find((v) => v.component.props.id === "body")!;
    expect(body.path).toEqual([
      { parentId: null, slotKey: null, index: 0 },
      { parentId: "stack", slotKey: "items", index: 1 },
      { parentId: "card", slotKey: "body", index: 0 },
    ]);
  });

  it("returns empty for empty content", () => {
    const empty: Data = { root: { props: {} }, content: [] };
    expect([...preOrder(empty)]).toEqual([]);
  });
});
