import { describe, it, expect } from "bun:test";
import { fieldIdentity } from "./field-identity.js";

describe("fieldIdentity", () => {
  it("root field → name is the path, id namespaced by element", () => {
    expect(
      fieldIdentity({ elementId: "el-1", path: "title", label: "title" }),
    ).toEqual({ name: "title", id: "duck-field-el-1-title" });
  });

  it("nested field → dotted path becomes a dash-safe unique id", () => {
    expect(
      fieldIdentity({
        elementId: "el-1",
        path: "items.0.title",
        label: "title",
      }),
    ).toEqual({ name: "items.0.title", id: "duck-field-el-1-items-0-title" });
  });

  it("same path on different elements → distinct DOM ids", () => {
    const a = fieldIdentity({
      elementId: "el-a",
      path: "title",
      label: "title",
    });
    const b = fieldIdentity({
      elementId: "el-b",
      path: "title",
      label: "title",
    });
    expect(a.id).not.toBe(b.id);
  });

  it("missing path → falls back to the label", () => {
    expect(fieldIdentity({ elementId: "el-1", label: "title" })).toEqual({
      name: "title",
      id: "duck-field-el-1-title",
    });
  });

  it("empty path → falls back to the label (never an empty name/id)", () => {
    const { name, id } = fieldIdentity({
      elementId: "el-1",
      path: "",
      label: "heading",
    });
    expect(name).toBe("heading");
    expect(id).toBe("duck-field-el-1-heading");
  });
});
