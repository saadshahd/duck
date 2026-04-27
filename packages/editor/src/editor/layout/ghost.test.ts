import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { ghostCandidateIds } from "./ghost.js";

const data = (content: ComponentData[]): Data => ({
  root: { props: {} },
  content,
});

const box = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Box",
  props: { id, items },
});

const text = (id: string): ComponentData => ({
  type: "Text",
  props: { id, text: "hi" },
});

describe("ghostCandidateIds", () => {
  it("returns components with empty slots", () => {
    expect(ghostCandidateIds(data([box("a", [])]))).toEqual(["a"]);
  });

  it("excludes components with non-empty slot", () => {
    expect(ghostCandidateIds(data([box("a", [text("b")])]))).toEqual([]);
  });

  it("excludes components with no slots", () => {
    expect(ghostCandidateIds(data([text("a")]))).toEqual([]);
  });

  it("returns multiple ghosts", () => {
    expect(ghostCandidateIds(data([box("a", []), box("b", [])]))).toEqual([
      "a",
      "b",
    ]);
  });

  it("returns empty when no candidates", () => {
    expect(ghostCandidateIds(data([text("a")]))).toEqual([]);
  });
});
