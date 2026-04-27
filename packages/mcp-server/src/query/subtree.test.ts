import { describe, it, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { subtree } from "./subtree.js";

const data: Data = {
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "page",
        children: [
          {
            type: "Stack",
            props: {
              id: "stack",
              gap: "1rem",
              children: [
                { type: "Text", props: { id: "a", text: "A" } },
                {
                  type: "Card",
                  props: {
                    id: "b",
                    children: [{ type: "Text", props: { id: "c", text: "C" } }],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};

describe("subtree", () => {
  it("returns the component plus its ancestry", async () => {
    const result = await Effect.runPromise(subtree(data, "stack"));
    expect((result.component.props as { id: string }).id).toBe("stack");
    expect(result.component.type).toBe("Stack");
    expect(
      (result.component.props as unknown as { children: unknown[] }).children,
    ).toHaveLength(2);
    expect(result.ancestry.map((a) => a.id)).toEqual(["page"]);
  });

  it("fails for unknown element", async () => {
    const exit = await Effect.runPromiseExit(subtree(data, "nope"));
    expect(exit._tag).toBe("Failure");
  });
});
