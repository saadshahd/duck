import { describe, it, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import { mapComponent } from "./map-component.js";

const make = (
  type: string,
  id: string,
  extra: Record<string, unknown> = {},
): ComponentData =>
  ({ type, props: { id, ...extra } }) as unknown as ComponentData;

describe("mapComponent", () => {
  it("returns identical structure when visit returns [child]", () => {
    const root = make("Stack", "s1", {
      children: [make("Heading", "h1"), make("Text", "t1")],
    });
    const result = mapComponent(root, (child) => [child]);
    expect(result).toEqual(root);
  });

  it("replaces a child via visitor", () => {
    const replacement = make("Image", "img1");
    const root = make("Stack", "s1", { children: [make("Heading", "h1")] });
    const result = mapComponent(root, (child) =>
      child.type === "Heading" ? [replacement] : [child],
    );
    expect(result.props.children).toEqual([replacement]);
  });

  it("expands one child into many", () => {
    const root = make("Stack", "s1", { children: [make("Heading", "h1")] });
    const extra = make("Text", "t1");
    const result = mapComponent(root, (child) => [child, extra]);
    expect(result.props.children).toEqual([make("Heading", "h1"), extra]);
  });

  it("removes a child when visitor returns []", () => {
    const root = make("Stack", "s1", {
      children: [make("Heading", "h1"), make("Text", "t1")],
    });
    const result = mapComponent(root, (child) =>
      child.type === "Heading" ? [] : [child],
    );
    expect(result.props.children).toEqual([make("Text", "t1")]);
  });

  it("does not recurse into children automatically", () => {
    const inner = make("Text", "t1");
    const middle = make("Stack", "s2", { children: [inner] });
    const root = make("Stack", "s1", { children: [middle] });
    const visited: string[] = [];
    mapComponent(root, (child) => {
      visited.push(child.props.id as string);
      return [child];
    });
    expect(visited).toEqual(["s2"]);
  });

  it("preserves scalar props and non-slot props on root", () => {
    const root = make("Stack", "s1", {
      gap: 4,
      children: [make("Heading", "h1")],
    });
    const result = mapComponent(root, (child) => [child]);
    expect(result.props.gap).toBe(4);
    expect(result.props.id).toBe("s1");
  });
});
