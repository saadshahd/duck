import { describe, it, expect } from "bun:test";
import type { Config } from "@puckeditor/core";
import { deriveVariations } from "./derive.js";

// @ts-ignore - test mock that doesn't need valid render function
const makeConfig = (components: any): Config =>
  ({ components, root: { render: () => null } }) as unknown as Config;

describe("deriveVariations", () => {
  it("returns empty array for component with no fields", () => {
    const config = makeConfig({
      Stack: { render: () => null },
    });
    expect(deriveVariations(config, "Stack")).toEqual([]);
  });

  it("returns empty array for unknown component type", () => {
    const config = makeConfig({});
    expect(deriveVariations(config, "Unknown")).toEqual([]);
  });

  it("returns empty array for field with non-layout key", () => {
    const config = makeConfig({
      Stack: {
        render: () => null,
        fields: {
          padding: {
            type: "select",
            options: [{ label: "Small", value: "sm" }],
          },
        },
      },
    });
    expect(deriveVariations(config, "Stack")).toEqual([]);
  });

  it("returns variations for 'direction' select field", () => {
    const config = makeConfig({
      Stack: {
        render: () => null,
        defaultProps: { direction: "vertical", gap: 4 },
        fields: {
          direction: {
            type: "select",
            options: [
              { label: "Horizontal", value: "horizontal" },
              { label: "Vertical", value: "vertical" },
            ],
          },
        },
      },
    });
    expect(deriveVariations(config, "Stack")).toEqual([
      {
        name: "Horizontal",
        componentType: "Stack",
        props: { direction: "horizontal", gap: 4 },
      },
      {
        name: "Vertical",
        componentType: "Stack",
        props: { direction: "vertical", gap: 4 },
      },
    ]);
  });

  it("returns variations for 'columns' select field", () => {
    const config = makeConfig({
      Grid: {
        render: () => null,
        defaultProps: { columns: 2 },
        fields: {
          columns: {
            type: "select",
            options: [
              { label: "2 Columns", value: 2 },
              { label: "3 Columns", value: 3 },
            ],
          },
        },
      },
    });
    expect(deriveVariations(config, "Grid")).toEqual([
      { name: "2 Columns", componentType: "Grid", props: { columns: 2 } },
      { name: "3 Columns", componentType: "Grid", props: { columns: 3 } },
    ]);
  });

  it("returns variations for 'variant' radio field", () => {
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

  it("combines variations from multiple layout fields", () => {
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

  it("uses empty object as default props when none defined", () => {
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
});
