import { describe, it, expect } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import {
  injectSlotPlaceholders,
  isSlotPlaceholderId,
  parseSlotPlaceholderId,
  slotPlaceholderId,
  SLOT_PLACEHOLDER_TYPE,
} from "./inject-slot-placeholders.js";

const hero = (id: string, slots: Record<string, ComponentData[]>): ComponentData => ({
  type: "Hero",
  props: { id, ...slots },
});

const data = (content: ComponentData[]): Data => ({ content, root: { props: {} } });

describe("injectSlotPlaceholders", () => {
  it("returns input identity when meta is undefined", () => {
    const d = data([hero("h1", { footer: [] })]);
    expect(injectSlotPlaceholders(d, undefined)).toBe(d);
  });

  it("returns input identity when no nodes match meta", () => {
    const d = data([hero("h1", { footer: [] })]);
    const meta = {};
    expect(injectSlotPlaceholders(d, meta)).toBe(d);
  });

  it("injects placeholder for empty optional slot", () => {
    const d = data([hero("h1", { footer: [] })]);
    const meta = { Hero: { slots: { footer: { optional: true } } } };
    const result = injectSlotPlaceholders(d, meta);
    const hero1 = result.content[0] as ComponentData;
    expect(hero1.props.footer).toEqual([
      {
        type: SLOT_PLACEHOLDER_TYPE,
        props: {
          id: slotPlaceholderId("h1", "footer"),
          parentId: "h1",
          slotKey: "footer",
        },
      },
    ]);
  });

  it("does not inject when optional slot has children", () => {
    const child: ComponentData = { type: "Text", props: { id: "t1" } };
    const d = data([hero("h1", { footer: [child] })]);
    const meta = { Hero: { slots: { footer: { optional: true } } } };
    expect(injectSlotPlaceholders(d, meta)).toBe(d);
  });

  it("does not inject for required (non-optional) empty slot", () => {
    const d = data([hero("h1", { content: [] })]);
    const meta = { Hero: { slots: { footer: { optional: true } } } };
    expect(injectSlotPlaceholders(d, meta)).toBe(d);
  });

  it("preserves identity of untouched siblings", () => {
    const text: ComponentData = { type: "Text", props: { id: "t1" } };
    const h = hero("h1", { footer: [] });
    const d = data([text, h]);
    const meta = { Hero: { slots: { footer: { optional: true } } } };
    const result = injectSlotPlaceholders(d, meta);
    expect(result.content[0]).toBe(text);
    expect(result.content[1]).not.toBe(h);
  });
});

describe("slotPlaceholderId helpers", () => {
  it("recognizes placeholder id", () => {
    expect(isSlotPlaceholderId("__slot:h1:footer")).toBe(true);
    expect(isSlotPlaceholderId("h1")).toBe(false);
  });

  it("parses placeholder id back to coords", () => {
    expect(parseSlotPlaceholderId("__slot:h1:footer")).toEqual({
      parentId: "h1",
      slotKey: "footer",
    });
  });

  it("returns null for non-placeholder id", () => {
    expect(parseSlotPlaceholderId("regular-id")).toBeNull();
  });
});
