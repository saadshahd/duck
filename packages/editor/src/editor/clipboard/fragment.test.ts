import { describe, test, expect } from "bun:test";
import type { ComponentData } from "@puckeditor/core";
import { Fragment } from "./fragment.js";

const leaf = (id: string): ComponentData => ({ type: "Text", props: { id } });

describe("Fragment", () => {
  test("serialize → parse round-trips a component", () => {
    expect(Fragment.parse(Fragment.serialize(leaf("a")))).toEqual(leaf("a"));
  });

  test("non-JSON text → undefined", () => {
    expect(Fragment.parse("plain clipboard text")).toBeUndefined();
  });

  test("JSON without the fragment tag → undefined", () => {
    expect(Fragment.parse(JSON.stringify({ foo: "bar" }))).toBeUndefined();
  });

  test("tagged JSON missing the component → undefined", () => {
    expect(
      Fragment.parse(JSON.stringify({ _tag: "puck-fragment" })),
    ).toBeUndefined();
  });

  test("JSON primitives → undefined", () => {
    expect(Fragment.parse("42")).toBeUndefined();
    expect(Fragment.parse("null")).toBeUndefined();
  });
});
