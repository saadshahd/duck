import { describe, expect, it } from "bun:test";
import type { ComponentData, Data } from "@puckeditor/core";
import { replaceById } from "./replace-by-id.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData => ({ type, props: { id, ...extra } }) as ComponentData;

const heading = make("Heading", "heading");
const text = make("Text", "text");
const card = make("Card", "card", { children: [heading, text] });
const footer = make("Footer", "footer");

const data: Data = {
  root: { props: {} },
  content: [card, footer],
};

describe("replaceById", () => {
  it("replaces a top-level component", () => {
    const replacement = make("Card", "card", { children: [] });
    const next = replaceById(data, { id: "card", node: replacement });

    expect(next).not.toBe(data);
    expect(next.content[0]).toBe(replacement);
    expect(next.content[1]).toBe(footer);
    expect(next.root).toBe(data.root);
  });

  it("rebuilds only the path to a nested component", () => {
    const replacement = make("Heading", "heading", { text: "Resolved" });
    const next = replaceById(data, { id: "heading", node: replacement });
    const nextCard = next.content[0] as ComponentData;
    const nextChildren = nextCard.props.children as ComponentData[];

    expect(next).not.toBe(data);
    expect(nextCard).not.toBe(card);
    expect(next.content[1]).toBe(footer);
    expect(nextChildren[0]).toBe(replacement);
    expect(nextChildren[1]).toBe(text);
  });

  it("returns the original data when the id is unknown", () => {
    expect(replaceById(data, { id: "nope", node: make("Box", "nope") })).toBe(
      data,
    );
  });

  it("replaces a component nested in an array-item slot", () => {
    const deep = make("Heading", "deep", { text: "old" });
    const gallery = make("Gallery", "gallery", {
      blocks: [{ content: [deep] }],
    });
    const nested: Data = { root: { props: {} }, content: [gallery] };
    const replacement = make("Heading", "deep", { text: "new" });
    const next = replaceById(nested, { id: "deep", node: replacement });
    const nextGallery = next.content[0] as ComponentData;
    const block = (
      nextGallery.props.blocks as { content: ComponentData[] }[]
    )[0];

    expect(next).not.toBe(nested);
    expect(block.content[0]).toBe(replacement);
  });
});
