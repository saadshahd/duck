import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { getChildrenAt } from "@json-render-editor/spec";
import {
  allIds,
  checkBoundsExclusive,
  checkBoundsInclusive,
  cloneAndMutate,
  cloneData,
  descendantIds,
  findById,
  findParent,
  moveInArray,
  writableChildrenAt,
} from "./helpers.js";

const text = (id: string, content = "x"): ComponentData => ({
  type: "Text",
  props: { id, text: content },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const sample = (): Data => ({
  root: { props: {} },
  content: [
    stack("s1", [text("t1"), text("t2")]),
    stack("s2", [text("t3", "y")]),
  ],
});

const empty = (): Data => ({ root: { props: {} }, content: [] });

describe("findById", () => {
  it("locates a top-level component", () => {
    expect(findById(sample(), "s1")?.props.id).toBe("s1");
  });

  it("locates a nested component", () => {
    expect(findById(sample(), "t3")?.props.text).toBe("y");
  });

  it("returns null when missing", () => {
    expect(findById(sample(), "zzz")).toBeNull();
  });

  it("returns null on empty data", () => {
    expect(findById(empty(), "anything")).toBeNull();
  });
});

describe("findParent", () => {
  it("returns top-level location for root entry", () => {
    expect(findParent(sample(), "s1")).toEqual({
      parentId: null,
      slotKey: null,
      index: 0,
    });
  });

  it("returns top-level location for second root entry", () => {
    expect(findParent(sample(), "s2")).toEqual({
      parentId: null,
      slotKey: null,
      index: 1,
    });
  });

  it("returns parent + slot for nested component", () => {
    expect(findParent(sample(), "t2")).toEqual({
      parentId: "s1",
      slotKey: "items",
      index: 1,
    });
  });

  it("returns null when missing", () => {
    expect(findParent(sample(), "zzz")).toBeNull();
  });
});

describe("descendantIds", () => {
  it("collects ids beneath a parent", () => {
    const s1 = findById(sample(), "s1")!;
    expect(descendantIds(s1)).toEqual(new Set(["t1", "t2"]));
  });

  it("returns empty set for leaf", () => {
    const t1 = findById(sample(), "t1")!;
    expect(descendantIds(t1).size).toBe(0);
  });
});

describe("allIds", () => {
  it("yields ids in pre-order", () => {
    expect(allIds(sample())).toEqual(["s1", "t1", "t2", "s2", "t3"]);
  });

  it("returns empty for empty content", () => {
    expect(allIds(empty())).toEqual([]);
  });
});

describe("getChildrenAt", () => {
  it("returns top-level content for null/null", () => {
    const data = sample();
    expect(getChildrenAt(data, null, null)).toBe(data.content);
  });

  it("returns the slot array for parentId+slotKey", () => {
    const arr = getChildrenAt(sample(), "s1", "items");
    expect(arr?.map((c) => c.props.id)).toEqual(["t1", "t2"]);
  });

  it("returns null when parent missing", () => {
    expect(getChildrenAt(sample(), "zzz", "items")).toBeNull();
  });

  it("returns null when slot is not an array", () => {
    expect(getChildrenAt(sample(), "t1", "text")).toBeNull();
  });

  it("returns null when only one of parentId/slotKey is null", () => {
    expect(getChildrenAt(sample(), "s1", null)).toBeNull();
    expect(getChildrenAt(sample(), null, "items")).toBeNull();
  });
});

describe("writableChildrenAt", () => {
  it("returns a mutable reference into the draft", () => {
    const draft = cloneData(sample());
    const arr = writableChildrenAt(draft, "s1", "items");
    expect(arr).not.toBeNull();
    arr!.push(text("new"));
    expect(findById(draft, "new")?.props.id).toBe("new");
  });

  it("returns top-level content for null/null", () => {
    const draft = cloneData(sample());
    const arr = writableChildrenAt(draft, null, null);
    expect(arr).toBe(draft.content);
  });

  it("returns null for missing parent", () => {
    expect(writableChildrenAt(cloneData(sample()), "zzz", "items")).toBeNull();
  });
});

describe("cloneAndMutate", () => {
  it("returns a new object", () => {
    const original = sample();
    const next = cloneAndMutate(original, () => {});
    expect(next).not.toBe(original);
  });

  it("does not mutate the input", () => {
    const original = sample();
    cloneAndMutate(original, (draft) => {
      draft.content.push(text("z"));
    });
    expect(original.content).toHaveLength(2);
  });
});

describe("checkBoundsInclusive", () => {
  it("accepts 0..length inclusive", () => {
    expect(checkBoundsInclusive(0, 3).isOk()).toBe(true);
    expect(checkBoundsInclusive(3, 3).isOk()).toBe(true);
  });

  it("rejects negative", () => {
    expect(checkBoundsInclusive(-1, 3).isOk()).toBe(false);
  });

  it("rejects > length", () => {
    expect(checkBoundsInclusive(4, 3).isOk()).toBe(false);
  });
});

describe("checkBoundsExclusive", () => {
  it("accepts 0..length-1", () => {
    expect(checkBoundsExclusive(0, 3).isOk()).toBe(true);
    expect(checkBoundsExclusive(2, 3).isOk()).toBe(true);
  });

  it("rejects length", () => {
    expect(checkBoundsExclusive(3, 3).isOk()).toBe(false);
  });
});

describe("moveInArray", () => {
  it("moves item forward", () => {
    expect(moveInArray([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });

  it("moves item backward", () => {
    expect(moveInArray([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });
});
