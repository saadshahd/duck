import { describe, it, expect } from "bun:test";
import type { Config } from "@puckeditor/core";
import { deriveVariations } from "./derive.js";

// @ts-ignore - test mock that doesn't need valid render function
const makeConfig = (components: any): Config =>
  ({ components, root: { render: () => null } }) as unknown as Config;

describe("deriveVariations", () => {
  it("returns empty array for component with no fields", () => {
    const config = makeConfig({ Stack: { render: () => null } });
    expect(deriveVariations(config, "Stack")).toEqual([]);
  });

  it("returns empty array for unknown component type", () => {
    const config = makeConfig({});
    expect(deriveVariations(config, "Unknown")).toEqual([]);
  });

  it("enumerates select field options regardless of key name", () => {
    const config = makeConfig({
      Card: {
        render: () => null,
        fields: {
          padding: {
            type: "select",
            options: [
              { label: "Small", value: "sm" },
              { label: "Large", value: "lg" },
            ],
          },
        },
      },
    });
    expect(deriveVariations(config, "Card")).toEqual([
      { name: "Small", componentType: "Card", props: { padding: "sm" } },
      { name: "Large", componentType: "Card", props: { padding: "lg" } },
    ]);
  });

  it("enumerates radio field options", () => {
    const config = makeConfig({
      Button: {
        render: () => null,
        defaultProps: { variant: "primary" },
        fields: {
          variant: {
            type: "radio",
            options: [
              { label: "Primary", value: "primary" },
              { label: "Secondary", value: "secondary" },
            ],
          },
        },
      },
    });
    expect(deriveVariations(config, "Button")).toEqual([
      {
        name: "Primary",
        componentType: "Button",
        props: { variant: "primary" },
      },
      {
        name: "Secondary",
        componentType: "Button",
        props: { variant: "secondary" },
      },
    ]);
  });

  it("combines choices from multiple fields", () => {
    const config = makeConfig({
      Flex: {
        render: () => null,
        defaultProps: { direction: "row", align: "start" },
        fields: {
          direction: {
            type: "select",
            options: [
              { label: "Row", value: "row" },
              { label: "Column", value: "column" },
            ],
          },
          align: {
            type: "select",
            options: [
              { label: "Start", value: "start" },
              { label: "Center", value: "center" },
            ],
          },
        },
      },
    });
    expect(deriveVariations(config, "Flex")).toEqual([
      {
        name: "Row",
        componentType: "Flex",
        props: { direction: "row", align: "start" },
      },
      {
        name: "Column",
        componentType: "Flex",
        props: { direction: "column", align: "start" },
      },
      {
        name: "Start",
        componentType: "Flex",
        props: { direction: "row", align: "start" },
      },
      {
        name: "Center",
        componentType: "Flex",
        props: { direction: "row", align: "center" },
      },
    ]);
  });

  it("uses empty object as defaults when none defined", () => {
    const config = makeConfig({
      Box: {
        render: () => null,
        fields: {
          layout: {
            type: "select",
            options: [{ label: "Full", value: "full" }],
          },
        },
      },
    });
    expect(deriveVariations(config, "Box")).toEqual([
      { name: "Full", componentType: "Box", props: { layout: "full" } },
    ]);
  });

  it("recurses into object fields", () => {
    const config = makeConfig({
      Grid: {
        render: () => null,
        defaultProps: { grid: { columns: 2, gap: 4 } },
        fields: {
          grid: {
            type: "object",
            objectFields: {
              columns: {
                type: "select",
                options: [
                  { label: "2 cols", value: 2 },
                  { label: "3 cols", value: 3 },
                ],
              },
            },
          },
        },
      },
    });
    expect(deriveVariations(config, "Grid")).toEqual([
      {
        name: "2 cols",
        componentType: "Grid",
        props: { grid: { columns: 2, gap: 4 } },
      },
      {
        name: "3 cols",
        componentType: "Grid",
        props: { grid: { columns: 3, gap: 4 } },
      },
    ]);
  });

  it("recurses into array fields using defaultItemProps", () => {
    const config = makeConfig({
      List: {
        render: () => null,
        fields: {
          items: {
            type: "array",
            defaultItemProps: { size: "md", label: "" },
            arrayFields: {
              size: {
                type: "select",
                options: [
                  { label: "Small", value: "sm" },
                  { label: "Large", value: "lg" },
                ],
              },
            },
          },
        },
      },
    });
    expect(deriveVariations(config, "List")).toEqual([
      {
        name: "Small",
        componentType: "List",
        props: { items: [{ size: "sm", label: "" }] },
      },
      {
        name: "Large",
        componentType: "List",
        props: { items: [{ size: "lg", label: "" }] },
      },
    ]);
  });

  it("skips open fields (text, number, textarea)", () => {
    const config = makeConfig({
      Hero: {
        render: () => null,
        fields: {
          title: { type: "text" },
          count: { type: "number" },
          body: { type: "textarea" },
        },
      },
    });
    expect(deriveVariations(config, "Hero")).toEqual([]);
  });
});
