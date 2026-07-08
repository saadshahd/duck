import { describe, it, expect } from "bun:test";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { allIds } from "@duckeditor/spec";
import { add } from "./add.js";
import { move } from "./move.js";
import { remove } from "./remove.js";
import { copy, paste } from "./clipboard.js";

const config: Config = {
  components: {
    Sections: {
      defaultProps: { items: [] },
      fields: {
        items: {
          type: "array",
          arrayFields: {
            heading: { type: "text" },
            content: { type: "slot" },
          },
        },
      },
      render: () => null as never,
    },
    Stack: {
      defaultProps: { children: [] },
      fields: { children: { type: "slot" } },
      render: () => null as never,
    },
    Text: {
      defaultProps: { text: "default text" },
      fields: { text: { type: "text" } },
      render: () => null as never,
    },
  },
  root: { render: () => null as never },
} as Config;

const text = (id: string, t = "x"): ComponentData => ({
  type: "Text",
  props: { id, text: t },
});

/** A `Sections` node whose single array item's `content` slot holds `children`. */
const sections = (id: string, children: ComponentData[]): ComponentData => ({
  type: "Sections",
  props: { id, items: [{ heading: "One", content: children }] },
});

/** Prop-path to the first array item's `content` slot. */
const nestedSite = (parentId: string) =>
  ({ at: "slot", parentId, path: ["items", 0, "content"] }) as const;

const contentOf = (data: Data, sectionsIndex = 0) =>
  (
    data.content[sectionsIndex]!.props as {
      items: Array<{ content: Array<{ props: { id: string } }> }>;
    }
  ).items[0]!.content;

describe("nested array-item slot — add", () => {
  it("inserts a child into items[0].content", () => {
    const data: Data = {
      root: { props: {} },
      content: [sections("sec", [text("t1")])],
    };
    const result = add(
      data,
      { site: nestedSite("sec"), component: text("t0"), index: 0 },
      config,
    );
    expect(result.isOk()).toBe(true);
    expect(contentOf(result._unsafeUnwrap()).map((c) => c.props.id)).toEqual([
      "t0",
      "t1",
    ]);
  });
});

describe("nested array-item slot — move", () => {
  it("moves a top-level child into a nested slot", () => {
    const data: Data = {
      root: { props: {} },
      content: [sections("sec", [text("nested")]), text("top")],
    };
    const result = move(data, "top", nestedSite("sec"), 1);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.content.map((c) => c.props.id)).toEqual(["sec"]);
    expect(contentOf(next).map((c) => c.props.id)).toEqual(["nested", "top"]);
  });

  it("moves a nested child back to a top-level slot", () => {
    const data: Data = {
      root: { props: {} },
      content: [
        sections("sec", [text("nested")]),
        { type: "Stack", props: { id: "stack", children: [] } },
      ],
    };
    const result = move(
      data,
      "nested",
      { at: "slot", parentId: "stack", path: ["children"] },
      0,
    );
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(contentOf(next).map((c) => c.props.id)).toEqual([]);
    const stackChildren = (
      next.content[1]!.props as { children: Array<{ props: { id: string } }> }
    ).children;
    expect(stackChildren.map((c) => c.props.id)).toEqual(["nested"]);
  });
});

describe("nested array-item slot — remove", () => {
  it("removes a nested child", () => {
    const data: Data = {
      root: { props: {} },
      content: [sections("sec", [text("a"), text("b")])],
    };
    const result = remove(data, "a");
    expect(result.isOk()).toBe(true);
    expect(contentOf(result._unsafeUnwrap()).map((c) => c.props.id)).toEqual([
      "b",
    ]);
  });
});

describe("nested array-item slot — duplicate", () => {
  it("pastes a subtree containing a nested slot with globally-unique ids", () => {
    const data: Data = {
      root: { props: {} },
      content: [sections("sec", [text("child")])],
    };
    const copied = copy(data, "sec");
    expect(copied.isOk()).toBe(true);
    const result = paste(data, { at: "root" }, copied._unsafeUnwrap(), config);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap().data;
    const ids = allIds(next);
    expect(ids.length).toBe(new Set(ids).size);
    // Original ids untouched; the paste minted fresh ids for the whole subtree.
    expect(ids).toContain("sec");
    expect(ids).toContain("child");
    expect(contentOf(next, 1).length).toBe(1);
    expect(contentOf(next, 1)[0]!.props.id).not.toBe("child");
  });
});
