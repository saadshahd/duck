import { describe, it, expect } from "bun:test";
import { remintIds } from "./id.js";
import { make } from "./testing.js";

describe("remintIds", () => {
  it("preserves IDs in the preserve set", () => {
    const root = make("Stack", "s1", {
      items: [make("Heading", "h1"), make("Text", "t1")],
    });
    const result = remintIds(root, new Set(["s1", "h1", "t1"]));
    const items = result.props.items as (typeof root)[];
    expect(result.props.id).toBe("s1");
    expect(items[0].props.id).toBe("h1");
    expect(items[1].props.id).toBe("t1");
  });

  it("remints IDs not in the preserve set", () => {
    const root = make("Stack", "s1", {
      items: [make("Heading", "tmpl-h"), make("Text", "tmpl-t")],
    });
    const result = remintIds(root, new Set(["s1"]));
    const items = result.props.items as (typeof root)[];
    expect(result.props.id).toBe("s1");
    expect(items[0].props.id).not.toBe("tmpl-h");
    expect(items[1].props.id).not.toBe("tmpl-t");
  });

  it("applying to two trees with same template IDs produces unique IDs", () => {
    const mkTree = (rootId: string) =>
      make("Stack", rootId, { items: [make("Text", "tmpl-t")] });

    const r1 = remintIds(mkTree("s1"), new Set(["s1"]));
    const r2 = remintIds(mkTree("s2"), new Set(["s2"]));
    const id1 = (r1.props.items as (typeof r1)[])[0].props.id;
    const id2 = (r2.props.items as (typeof r2)[])[0].props.id;
    expect(id1).not.toBe("tmpl-t");
    expect(id2).not.toBe("tmpl-t");
    expect(id1).not.toBe(id2);
  });

  it("recurses into nested containers", () => {
    const root = make("Stack", "s1", {
      items: [
        make("Stack", "inner", {
          items: [make("Heading", "tmpl-h")],
        }),
      ],
    });
    const result = remintIds(root, new Set(["s1"]));
    const inner = (result.props.items as (typeof root)[])[0];
    const heading = (inner.props.items as (typeof root)[])[0];
    expect(inner.props.id).not.toBe("inner");
    expect(heading.props.id).not.toBe("tmpl-h");
  });
});
