import type { Config } from "@puckeditor/core";
import { describe, expect, test } from "bun:test";
import { buttonConfig } from "../components/button";
import { comparisonTableConfig } from "../components/comparison-table";
import { dividerConfig } from "../components/divider";
import { featureGridConfig } from "../components/feature-grid";
import { headingConfig } from "../components/heading";
import { imageConfig } from "../components/image";
import { productSummaryConfig } from "../components/product-summary";
import { sectionConfig } from "../components/section";
import { textConfig } from "../components/text";
import { config } from "../puck.config";
import { inventoryDoc, inventoryGroups, variantFields } from "./inventory";

describe("inventoryGroups", () => {
  test("lists every registered component exactly once", () => {
    const listed = inventoryGroups(config).flatMap((group) => group.types);
    expect([...listed].sort()).toEqual(Object.keys(config.components).sort());
  });

  test("no Uncategorized group when every component is categorized", () => {
    expect(inventoryGroups(config).map((g) => g.title)).not.toContain(
      "Uncategorized",
    );
  });

  test("groups follow category order and titles", () => {
    expect(inventoryGroups(config).map((g) => g.title)).toEqual([
      "Atoms",
      "Molecules",
      "Collection organisms",
      "Computed widgets",
      "Field / free-host organisms",
    ]);
  });

  test("a component missing from every category surfaces under Uncategorized", () => {
    const orphaned: Config = {
      ...config,
      categories: { atoms: { title: "Atoms", components: ["Heading"] } },
    };
    const groups = inventoryGroups(orphaned);
    const uncategorized = groups.find((g) => g.title === "Uncategorized");
    expect(uncategorized?.types).toContain("Button");
    expect(uncategorized?.types).not.toContain("Heading");
  });
});

describe("variantFields", () => {
  test("Button offers its variant axis", () => {
    expect(variantFields(buttonConfig)).toEqual([
      {
        key: "variant",
        options: [
          { label: "Primary", value: "primary" },
          { label: "Secondary", value: "secondary" },
          { label: "Ghost", value: "ghost" },
        ],
      },
    ]);
  });

  test("Image offers ratio; Heading offers level", () => {
    expect(variantFields(imageConfig).map((f) => f.key)).toEqual(["ratio"]);
    expect(variantFields(headingConfig).map((f) => f.key)).toEqual(["level"]);
  });

  test("collection organism offers density, never theme", () => {
    expect(variantFields(featureGridConfig).map((f) => f.key)).toEqual([
      "density",
    ]);
  });

  test("no axis for text-only, single-option, or content-resolver fields", () => {
    expect(variantFields(textConfig)).toEqual([]);
    expect(variantFields(dividerConfig)).toEqual([]); // variant has one option
    expect(variantFields(sectionConfig)).toEqual([]); // theme + slot only
    expect(variantFields(comparisonTableConfig)).toEqual([]); // morphable:false selects
  });
});

describe("inventoryDoc", () => {
  test("injects the selected theme for a themed organism and mints nested ids", () => {
    const doc = inventoryDoc({
      config,
      type: "FeatureGrid",
      theme: "business",
      prefix: "inv-FeatureGrid",
    });
    const node = doc.content[0];
    expect(node.props.id).toBe("inv-FeatureGrid-0");
    expect(node.props.theme).toBe("business");
    const items = node.props.items as { props: { id: string } }[];
    expect(items.map((i) => i.props.id)).toEqual([
      "inv-FeatureGrid-0-items-0",
      "inv-FeatureGrid-0-items-1",
      "inv-FeatureGrid-0-items-2",
    ]);
  });

  test("does not inject theme into an atom that has no theme field", () => {
    const doc = inventoryDoc({
      config,
      type: "Heading",
      theme: "business",
      prefix: "inv-Heading",
    });
    expect("theme" in doc.content[0].props).toBe(false);
  });

  test("override replaces a variant field", () => {
    const doc = inventoryDoc({
      config,
      type: "Button",
      theme: "personal",
      prefix: "inv-Button-variant-ghost",
      override: { variant: "ghost" },
    });
    expect(doc.content[0].props.variant).toBe("ghost");
  });
});
