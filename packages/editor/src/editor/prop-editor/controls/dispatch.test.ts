import { describe, it, expect } from "bun:test";
import type { Field } from "@puckeditor/core";
import type { FieldProps, ControlRenderer } from "./index.js";
import { resolveRenderer } from "./dispatch.js";

// --- Factories ---

const field = (
  type: Field["type"],
  metadata?: Record<string, unknown>,
): Field => ({ type, ...(metadata ? { metadata } : {}) }) as Field;

const props = (f: Field): FieldProps<Field, unknown> => ({
  label: "test",
  field: f,
  value: undefined,
  onChange: () => {},
});

const renderer =
  (id: string): ControlRenderer =>
  () =>
    null as unknown as ReturnType<ControlRenderer>;

// --- Dispatch matrix ---

describe("resolveRenderer — metadata.control wins when registered", () => {
  it("routes to control renderer when metadata.control is set and registered", () => {
    const seg = renderer("segmented");
    const controlRenderers: Record<string, ControlRenderer> = {
      segmented: seg,
    };
    const typeRenderers: Record<string, ControlRenderer> = {};

    const f = field("text", { control: "segmented" });
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBe(seg);
  });

  it("routes to control renderer even when a type renderer also exists", () => {
    const seg = renderer("segmented");
    const textRenderer = renderer("text-type");
    const controlRenderers: Record<string, ControlRenderer> = {
      segmented: seg,
    };
    const typeRenderers: Record<string, ControlRenderer> = {
      text: textRenderer,
    };

    const f = field("text", { control: "segmented" });
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBe(seg);
  });
});

describe("resolveRenderer — honest fallback when control is annotated but unregistered", () => {
  it("falls through to type renderer when control is not in controlRenderers", () => {
    const textRenderer = renderer("text-type");
    const controlRenderers: Record<string, ControlRenderer> = {};
    const typeRenderers: Record<string, ControlRenderer> = {
      text: textRenderer,
    };

    const f = field("text", { control: "segmented" });
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBe(textRenderer);
  });
});

describe("resolveRenderer — no metadata, falls through to type renderer", () => {
  it("routes to type renderer when no metadata is present", () => {
    const textRenderer = renderer("text-type");
    const controlRenderers: Record<string, ControlRenderer> = {};
    const typeRenderers: Record<string, ControlRenderer> = {
      text: textRenderer,
    };

    const f = field("text");
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBe(textRenderer);
  });

  it("routes to type renderer when metadata lacks control key", () => {
    const textRenderer = renderer("text-type");
    const controlRenderers: Record<string, ControlRenderer> = {};
    const typeRenderers: Record<string, ControlRenderer> = {
      text: textRenderer,
    };

    const f = field("text", { unit: "rem" });
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBe(textRenderer);
  });

  it("routes to type renderer when metadata.control is non-string", () => {
    const textRenderer = renderer("text-type");
    const controlRenderers: Record<string, ControlRenderer> = {};
    const typeRenderers: Record<string, ControlRenderer> = {
      text: textRenderer,
    };

    const f = field("text", { control: 42 });
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBe(textRenderer);
  });
});

describe("resolveRenderer — fallback to undefined when both dispatch tables miss", () => {
  it("returns undefined for unknown type and no registered control", () => {
    const controlRenderers: Record<string, ControlRenderer> = {};
    const typeRenderers: Record<string, ControlRenderer> = {};

    // Use a valid Puck field type that has no renderer in our table
    const f = field("custom" as Field["type"]);
    const result = resolveRenderer(props(f), controlRenderers, typeRenderers);

    expect(result).toBeUndefined();
  });
});
