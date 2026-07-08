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
    expect(first.path).toEqual([{ at: "root", index: 0 }]);
  });

  it("yields nested path with parentId and slot prop-path", () => {
    const visits = [...preOrder(data)];
    const heading = visits.find((v) => v.component.props.id === "heading")!;
    expect(heading.path).toEqual([
      { at: "root", index: 0 },
      { at: "slot", parentId: "stack", path: ["items"], index: 0 },
    ]);
  });

  it("yields deepest path through multiple slots", () => {
    const visits = [...preOrder(data)];
    const body = visits.find((v) => v.component.props.id === "body")!;
    expect(body.path).toEqual([
      { at: "root", index: 0 },
      { at: "slot", parentId: "stack", path: ["items"], index: 1 },
      { at: "slot", parentId: "card", path: ["body"], index: 0 },
    ]);
  });

  it("descends into array-item slots, addressing them by prop-path", () => {
    const sections: Data = {
      root: { props: {} },
      content: [
        make("Sections", "sections", {
          items: [
            { heading: "Intro", content: [make("Text", "intro")] },
            { heading: "Body", content: [make("Text", "body-text")] },
          ],
        }),
      ],
    };
    const visits = [...preOrder(sections)];
    expect(visits.map((v) => v.component.props.id)).toEqual([
      "sections",
      "intro",
      "body-text",
    ]);
    const bodyText = visits.find((v) => v.component.props.id === "body-text")!;
    expect(bodyText.path).toEqual([
      { at: "root", index: 0 },
      {
        at: "slot",
        parentId: "sections",
        path: ["items", 1, "content"],
        index: 0,
      },
    ]);
  });

  it("returns empty for empty content", () => {
    const empty: Data = { root: { props: {} }, content: [] };
    expect([...preOrder(empty)]).toEqual([]);
  });
});
