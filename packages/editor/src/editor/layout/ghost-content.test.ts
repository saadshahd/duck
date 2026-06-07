import { describe, expect, test } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { ghostContent } from "./ghost-content.js";
import type { DropTarget } from "./destinations.js";

const card = (id: string, children: Record<string, ComponentData[]>) =>
  ({ type: "Card", props: { id, ...children } }) as ComponentData;

const heading = (id: string) =>
  ({ type: "Heading", props: { id } }) as ComponentData;

const data: Data = {
  root: { props: {} },
  content: [
    card("card-1", {
      header: [heading("h-1")],
      body: [],
      footer: [],
    }),
  ],
  zones: {},
};

describe("ghostContent", () => {
  test("no target → blocked, no destination name", () => {
    expect(ghostContent("Heading", null, data)).toEqual({
      sourceType: "Heading",
      valid: false,
    });
  });

  test("none-kind target → blocked, no destination name", () => {
    const target: DropTarget = { kind: "none", elementId: "card-1" };
    expect(ghostContent("Heading", target, data)).toEqual({
      sourceType: "Heading",
      valid: false,
    });
  });

  test("container target → valid, `Component › slot` destination", () => {
    const target: DropTarget = {
      kind: "container",
      elementId: "card-1",
      slotKey: "body",
      index: 0,
      tiling: {
        kind: "tiled",
        axis: "vertical",
        tiles: [],
        carved: [],
        yielded: [],
      },
      activeLabel: "Card › body",
    };
    expect(ghostContent("Heading", target, data)).toEqual({
      sourceType: "Heading",
      valid: true,
      destination: "Card › body",
    });
  });

  test("line target → valid, parent slot destination", () => {
    const target: DropTarget = {
      kind: "line",
      elementId: "h-1",
      edge: "bottom",
      axis: "vertical",
    };
    expect(ghostContent("Heading", target, data)).toEqual({
      sourceType: "Heading",
      valid: true,
      destination: "Card › header",
    });
  });

  test("root target → valid, root destination", () => {
    const target: DropTarget = { kind: "root", index: 0, label: "Root" };
    expect(ghostContent("Heading", target, data)).toEqual({
      sourceType: "Heading",
      valid: true,
      destination: "Root",
    });
  });

  test("line target whose container is unresolvable → blocked", () => {
    const target: DropTarget = {
      kind: "line",
      elementId: "missing",
      edge: "bottom",
      axis: "vertical",
    };
    expect(ghostContent("Heading", target, data)).toEqual({
      sourceType: "Heading",
      valid: false,
    });
  });
});
