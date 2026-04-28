import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import { fingerprint } from "./fingerprint.js";

const make = (type: string, id: string = "id-1"): ComponentData =>
  ({ type, props: { id } }) as unknown as ComponentData;

describe("fingerprint", () => {
  it("returns component type for a single component", () => {
    expect(fingerprint(make("Stack"))).toBe("Stack");
  });

  it("returns the exact type string", () => {
    expect(fingerprint(make("Heading"))).toBe("Heading");
  });

  it("is case-sensitive", () => {
    expect(fingerprint(make("button"))).toBe("button");
    expect(fingerprint(make("Button"))).toBe("Button");
  });
});
