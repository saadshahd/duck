import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { findById } from "./find-by-id.js";

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
      items: [make("Heading", "h1", { text: "Hi" })],
    }),
  ],
};

describe("findById", () => {
  it("returns the top-level component", () => {
    const c = findById(data, "stack");
    expect(c?.type).toBe("Stack");
  });

  it("returns a nested component", () => {
    const c = findById(data, "h1");
    expect(c?.props).toMatchObject({ id: "h1", text: "Hi" });
  });

  it("returns null for unknown id", () => {
    expect(findById(data, "nope")).toBeNull();
  });
});
