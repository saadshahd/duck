import { describe, it, expect } from "bun:test";
import type { Config } from "@puckeditor/core";
import { deriveVariations } from "./derive.js";

const makeConfig = (components: Config["components"]): Config =>
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
    const result = deriveVariations(config, "Stack");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "Horizontal",
      componentType: "Stack",
      props: { direction: "horizontal", gap: 4 },
    });
    expect(result[1]).toEqual({
      name: "Vertical",
      componentType: "Stack",
      props: { direction: "vertical", gap: 4 },
    });
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
    const result = deriveVariations(config, "Grid");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("2 Columns");
    expect(result[0].props.columns).toBe(2);
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
    const result = deriveVariations(config, "Button");
    expect(result).toHaveLength(2);
    expect(result[0].componentType).toBe("Button");
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
    const result = deriveVariations(config, "Flex");
    expect(result).toHaveLength(4); // 2 from direction + 2 from align
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
    const result = deriveVariations(config, "Box");
    expect(result[0].props).toEqual({ layout: "full" });
  });
});
