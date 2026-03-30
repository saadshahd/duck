import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { ghostCandidateIds } from "./ghost.js";

const spec = (elements: Spec["elements"]): Spec => ({
  root: "page",
  elements,
});

describe("ghostCandidateIds", () => {
  it("returns elements with empty children array", () => {
    const result = ghostCandidateIds(
      spec({
        page: { type: "Box", props: {}, children: ["a"] },
        a: { type: "Box", props: {}, children: [] },
      }),
    );
    expect(result).toEqual(["a"]);
  });

  it("excludes elements with children", () => {
    const result = ghostCandidateIds(
      spec({
        page: { type: "Box", props: {}, children: ["a"] },
        a: { type: "Box", props: {}, children: ["b"] },
        b: { type: "Text", props: { text: "hi" } },
      }),
    );
    expect(result).toEqual([]);
  });

  it("excludes elements without children property", () => {
    const result = ghostCandidateIds(
      spec({
        page: { type: "Box", props: {}, children: ["a"] },
        a: { type: "Text", props: { text: "hi" } },
      }),
    );
    expect(result).toEqual([]);
  });

  it("returns multiple ghosts", () => {
    const result = ghostCandidateIds(
      spec({
        page: { type: "Box", props: {}, children: ["a", "b"] },
        a: { type: "Box", props: {}, children: [] },
        b: { type: "Box", props: {}, children: [] },
      }),
    );
    expect(result).toEqual(["a", "b"]);
  });

  it("returns empty for spec with no ghost candidates", () => {
    const result = ghostCandidateIds(
      spec({
        page: { type: "Text", props: { text: "hi" } },
      }),
    );
    expect(result).toEqual([]);
  });
});
