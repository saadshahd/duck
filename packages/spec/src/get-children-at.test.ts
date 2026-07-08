import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { getChildrenAt, writableChildrenAt } from "./get-children-at.js";

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
      items: [make("Heading", "h1"), make("Text", "t1")],
      title: "not a slot",
    }),
    make("Footer", "footer"),
  ],
};

describe("getChildrenAt", () => {
  it("returns data.content for the root site", () => {
    const children = getChildrenAt(data, { at: "root" });
    expect(children).toBe(data.content);
  });

  it("returns slot array for known parent + slot", () => {
    const children = getChildrenAt(data, {
      at: "slot",
      parentId: "stack",
      path: ["items"],
    })!;
    expect(children.map((c) => c.props.id)).toEqual(["h1", "t1"]);
  });

  it("returns null for unknown parentId", () => {
    expect(
      getChildrenAt(data, { at: "slot", parentId: "nope", path: ["items"] }),
    ).toBeNull();
  });

  it("returns null when the path is not a slot field", () => {
    expect(
      getChildrenAt(data, { at: "slot", parentId: "stack", path: ["title"] }),
    ).toBeNull();
  });

  it("resolves children in an array-item slot by prop-path", () => {
    const sections: Data = {
      root: { props: {} },
      content: [
        make("Sections", "sections", {
          items: [
            { heading: "a", content: [make("Text", "a-text")] },
            { heading: "b", content: [make("Text", "b1"), make("Text", "b2")] },
          ],
        }),
      ],
    };
    const children = getChildrenAt(sections, {
      at: "slot",
      parentId: "sections",
      path: ["items", 1, "content"],
    })!;
    expect(children.map((c) => c.props.id)).toEqual(["b1", "b2"]);
  });
});

describe("writableChildrenAt", () => {
  it("returns a mutable reference into the draft", () => {
    const draft = structuredClone(data);
    const arr = writableChildrenAt(draft, {
      at: "slot",
      parentId: "stack",
      path: ["items"],
    });
    expect(arr).not.toBeNull();
    arr!.push(make("Text", "new"));
    expect(draft.content[0]!.props.items).toHaveLength(3);
  });

  it("returns a mutable reference into an array-item slot", () => {
    const draft: Data = {
      root: { props: {} },
      content: [
        make("Sections", "sections", {
          items: [{ heading: "a", content: [make("Text", "a-text")] }],
        }),
      ],
    };
    const arr = writableChildrenAt(draft, {
      at: "slot",
      parentId: "sections",
      path: ["items", 0, "content"],
    });
    expect(arr).not.toBeNull();
    arr!.push(make("Text", "new"));
    expect(
      (draft.content[0]!.props.items as { content: unknown[] }[])[0]!.content,
    ).toHaveLength(2);
  });

  it("returns data.content for the root site", () => {
    const draft = structuredClone(data);
    expect(writableChildrenAt(draft, { at: "root" })).toBe(draft.content);
  });

  it("returns null for unknown parentId", () => {
    expect(
      writableChildrenAt(structuredClone(data), {
        at: "slot",
        parentId: "nope",
        path: ["items"],
      }),
    ).toBeNull();
  });

  it("returns null when slot value isn't an array", () => {
    expect(
      writableChildrenAt(structuredClone(data), {
        at: "slot",
        parentId: "footer",
        path: ["items"],
      }),
    ).toBeNull();
  });
});
