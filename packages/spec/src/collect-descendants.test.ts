import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { collectDescendants } from "./collect-descendants.js";

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
        make("Card", "card", { body: [make("Text", "body")] }),
        make("Heading", "h1"),
      ],
    }),
    make("Footer", "footer"),
  ],
};

describe("collectDescendants", () => {
  it("returns all descendants in pre-order", () => {
    expect(collectDescendants(data, "stack")).toEqual(["card", "body", "h1"]);
  });

  it("returns single child for one-deep nesting", () => {
    expect(collectDescendants(data, "card")).toEqual(["body"]);
  });

  it("returns empty for leaf", () => {
    expect(collectDescendants(data, "h1")).toEqual([]);
  });

  it("returns empty for unknown id", () => {
    expect(collectDescendants(data, "nope")).toEqual([]);
  });

  it("collects descendants through array-item slots", () => {
    const sections: Data = {
      root: { props: {} },
      content: [
        make("Sections", "sections", {
          items: [
            { heading: "a", content: [make("Text", "a-text")] },
            {
              heading: "b",
              content: [
                make("Card", "b-card", { body: [make("Text", "b-text")] }),
              ],
            },
          ],
        }),
      ],
    };
    expect(collectDescendants(sections, "sections")).toEqual([
      "a-text",
      "b-card",
      "b-text",
    ]);
  });
});
