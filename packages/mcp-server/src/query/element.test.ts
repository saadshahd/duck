import { describe, it, expect } from "bun:test";
import type { Data } from "@puckeditor/core";
import { Effect } from "effect";
import { element } from "./element.js";

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
                { type: "Heading", props: { id: "heading", text: "Hello" } },
              ],
            },
          },
        ],
      },
    },
  ],
};

describe("element", () => {
  it("returns full element with ancestry and slot summary", async () => {
    const result = await Effect.runPromise(element(data, "heading"));
    expect(result.id).toBe("heading");
    expect(result.type).toBe("Heading");
    expect(result.props).toEqual({ id: "heading", text: "Hello" });
    expect(result.slots).toEqual({});
    expect(result.ancestry.map((a) => a.id)).toEqual(["page", "stack"]);
  });

  it("returns slot child counts for components with slots", async () => {
    const result = await Effect.runPromise(element(data, "stack"));
    expect(result.slots).toEqual({ children: 1 });
    expect(result.props.gap).toBe("1rem");
    expect(result.props.children).toBeUndefined();
  });

  it("returns empty ancestry for top-level", async () => {
    const result = await Effect.runPromise(element(data, "page"));
    expect(result.ancestry).toEqual([]);
  });

  it("fails for unknown element", async () => {
    const exit = await Effect.runPromiseExit(element(data, "nope"));
    expect(exit._tag).toBe("Failure");
  });
});
