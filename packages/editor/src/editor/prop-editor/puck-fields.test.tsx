import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Config, Data, Field } from "@puckeditor/core";
import { PuckFields } from "./puck-fields.js";

const emptyData: Data = { content: [], root: { props: {} } };
const emptyConfig: Config = { components: {} };
const noopCommit = () => ({ status: "unchanged" as const });

const objectField = (
  label: string,
  objectFields: Record<string, Field>,
  metadata?: Record<string, unknown>,
): Field =>
  ({ type: "object", label, objectFields, metadata }) as unknown as Field;

const textField = (label: string): Field =>
  ({ type: "text", label }) as unknown as Field;

const render = (fields: Record<string, Field>) =>
  renderToStaticMarkup(
    <PuckFields
      fields={fields}
      values={{}}
      onChange={() => {}}
      elementId="test"
      data={emptyData}
      config={emptyConfig}
      commit={noopCommit}
    />,
  );

describe("PuckFields — object field grouping", () => {
  it("renders a section heading using field.label for an object field", () => {
    const fields: Record<string, Field> = {
      style: objectField("Styling", { color: textField("Color") }),
    };
    const markup = render(fields);
    const host = document.createElement("div");
    host.innerHTML = markup;
    const heading = host.querySelector(".field-section-heading");
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
    const markup = render(fields);
    const host = document.createElement("div");
    host.innerHTML = markup;
    const heading = host.querySelector(".field-section-heading");
    expect(heading?.textContent).toBe("Appearance");
  });

  it("falls back to the field key when label is absent", () => {
    const fields: Record<string, Field> = {
      style: {
        type: "object",
        objectFields: { color: textField("Color") },
      } as unknown as Field,
    };
    const markup = render(fields);
    const host = document.createElement("div");
    host.innerHTML = markup;
    const heading = host.querySelector(".field-section-heading");
    expect(heading?.textContent).toBe("style");
  });

  it("renders sub-fields inside the section", () => {
    const fields: Record<string, Field> = {
      style: objectField("Styling", {
        color: textField("Color"),
        size: textField("Size"),
      }),
    };
    const markup = render(fields);
    const host = document.createElement("div");
    host.innerHTML = markup;
    const section = host.querySelector(".field-section");
    const labels = [...section!.querySelectorAll("label")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Color", "Size"]);
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
    const markup = render(fields);
    const host = document.createElement("div");
    host.innerHTML = markup;
    const sections = [...host.querySelectorAll(".field-section")];
    expect(sections.length).toBe(1);
    expect(
      sections[0].querySelector(".field-section-heading")?.textContent,
    ).toBe("Theme");
  });
});
