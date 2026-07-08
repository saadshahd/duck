import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Field } from "@puckeditor/core";
import { fieldsTree } from "./puck-fields-testing.js";

const objectField = (
  label: string,
  objectFields: Record<string, Field>,
  metadata?: Record<string, unknown>,
): Field =>
  ({ type: "object", label, objectFields, metadata }) as unknown as Field;

const textField = (label: string): Field =>
  ({ type: "text", label }) as unknown as Field;

/** Render the fields to static markup and return a queryable host element. */
const render = (fields: Record<string, Field>): HTMLElement => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(fieldsTree(fields));
  return host;
};

describe("PuckFields — object field grouping", () => {
  it("renders a section heading using field.label for an object field", () => {
    const fields: Record<string, Field> = {
      style: objectField("Styling", { color: textField("Color") }),
    };
    const heading = render(fields).querySelector(".field-section-heading");
    expect(heading?.textContent).toBe("Styling");
  });

  it("uses metadata.group over field.label when present", () => {
    const fields: Record<string, Field> = {
      style: objectField(
        "Styling",
        { color: textField("Color") },
        {
          group: "Appearance",
        },
      ),
    };
    const heading = render(fields).querySelector(".field-section-heading");
    expect(heading?.textContent).toBe("Appearance");
  });

  it("falls back to a humanized field key when label is absent", () => {
    const fields: Record<string, Field> = {
      backgroundColor: {
        type: "object",
        objectFields: { color: textField("Color") },
      } as unknown as Field,
    };
    const heading = render(fields).querySelector(".field-section-heading");
    expect(heading?.textContent).toBe("Background color");
  });

  it("humanizes nested object sub-field labels when no explicit label is set", () => {
    const fields: Record<string, Field> = {
      style: objectField("Styling", {
        marginBottom: { type: "text" } as unknown as Field,
      }),
    };
    const section = render(fields).querySelector(".field-section");
    const labels = [...section!.querySelectorAll("label")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Margin bottom"]);
  });

  it("renders sub-fields inside the section", () => {
    const fields: Record<string, Field> = {
      style: objectField("Styling", {
        color: textField("Color"),
        size: textField("Size"),
      }),
    };
    const section = render(fields).querySelector(".field-section");
    const labels = [...section!.querySelectorAll("label")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Color", "Size"]);
  });

  it("custom field render receives a real name and an element-scoped unique id", () => {
    let received: { name?: string; id?: string } = {};
    const custom = {
      type: "custom",
      render: (p: { name: string; id: string }) => {
        received = { name: p.name, id: p.id };
        return <div />;
      },
    } as unknown as Field;
    render({ banner: custom });
    expect(received).toEqual({
      name: "banner",
      id: "duck-field-test-banner",
    });
  });

  it("clusters top-level fields with the same metadata.group under one shared heading", () => {
    const fields: Record<string, Field> = {
      color: {
        ...textField("Color"),
        metadata: { group: "Theme" },
      } as unknown as Field,
      bg: {
        ...textField("Background"),
        metadata: { group: "Theme" },
      } as unknown as Field,
    };
    const sections = [...render(fields).querySelectorAll(".field-section")];
    expect(sections.length).toBe(1);
    expect(
      sections[0].querySelector(".field-section-heading")?.textContent,
    ).toBe("Theme");
  });
});
