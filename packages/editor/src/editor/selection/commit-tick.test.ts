import { describe, it, expect } from "bun:test";
import { commitTick } from "./commit-tick.js";

const entry = (group?: string) => ({ group });

describe("commitTick", () => {
  it("counts entries in the selected element's prop group", () => {
    const entries = [
      entry(),
      entry("prop:a"),
      entry("prop:a"),
      entry("prop:b"),
    ];
    expect(commitTick(entries, "a")).toBe(2);
  });

  it("zero when no selection", () => {
    expect(commitTick([entry("prop:a")], null)).toBe(0);
  });

  it("zero when the element has no prop commits", () => {
    expect(commitTick([entry("prop:b")], "a")).toBe(0);
  });

  it("counts only entries for the selected id, not others", () => {
    const entries = [
      entry("prop:a"),
      entry("prop:a"),
      entry("prop:b"),
      entry("prop:b"),
      entry("prop:b"),
    ];
    expect(commitTick(entries, "b")).toBe(3);
  });

  it("empty entries → zero", () => {
    expect(commitTick([], "a")).toBe(0);
  });

  it("entries without group field are ignored", () => {
    const entries = [entry(), entry(), entry("prop:a")];
    expect(commitTick(entries, "a")).toBe(1);
  });

  it("null selection with entries → zero regardless", () => {
    const entries = [entry("prop:a"), entry("prop:b")];
    expect(commitTick(entries, null)).toBe(0);
  });
});
