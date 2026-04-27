import { describe, it, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { outline } from "./outline.js";

const data: Data = {
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "page",
        bg: "white",
        children: [
          {
            type: "Stack",
            props: {
              id: "stack",
              gap: "1rem",
              children: [
                { type: "Heading", props: { id: "heading", text: "Hello" } },
                {
                  type: "Card",
                  props: {
                    id: "card",
                    children: [
                      { type: "Text", props: { id: "body", text: "content" } },
                    ],
                  },
                },
              ],
            },
          },
          { type: "Footer", props: { id: "footer", text: "bye" } },
        ],
      },
    },
  ],
};

describe("outline", () => {
  it("counts every component in tree", async () => {
    const result = await Effect.runPromise(outline(data, 5));
    expect(result.totalComponents).toBe(6);
  });

  it("returns one outline node per top-level content entry", async () => {
    const result = await Effect.runPromise(outline(data, 1));
    expect(result.outline).toHaveLength(1);
    expect((result.outline[0] as { id: string }).id).toBe("page");
  });

  it("collapses below maxDepth to a summary with childCount", async () => {
    const result = await Effect.runPromise(outline(data, 1));
    const page = result.outline[0] as {
      slots: Record<string, Array<{ id: string; childCount: number }>>;
    };
    const stack = page.slots.children[0]!;
    expect(stack.id).toBe("stack");
    expect(stack.childCount).toBe(2);
  });
});
