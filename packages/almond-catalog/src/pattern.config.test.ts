/**
 * The named Pattern palette (sp-64 §5.2), proven against the REAL engine
 * (`@duckeditor/patterns` `createPatternRegistry` + `remintIds`) driven by the catalog's own
 * `config` — no editor import, no re-implemented tree walking.
 *
 * The design is "fix the signature, slot the generic" (see pattern.config.ts): each pattern's
 * signature beat is UNSLOTTED so it injects onto an empty Section verbatim; the generic framing
 * it re-homes rides an optional slot. The obligations that pins down:
 *   1. drop palette: all 4 patterns apply to an empty Section (every slot optional);
 *   2. done-bar: dropping "Section Intro" onto an empty Section yields exactly Heading + Text;
 *   3. injection: a signature ("Get the App" badges) is NEW content, not harvested from the Section;
 *   4. re-home: generic content (an existing heading/lede) is carried across, ids preserved;
 *   5. lossless gates: a pattern is withheld when the Section already holds a signature role, or
 *      holds content no slot accepts.
 * Plus: reminting yields globally-unique, non-template ids; every registered component has a role.
 */

import type { ComponentData, Data } from "@puckeditor/core";
import { createPatternRegistry, remintIds } from "@duckeditor/patterns";
import { allIds } from "@duckeditor/spec";
import { describe, expect, test } from "bun:test";
import { config } from "./puck.config";
import { patternConfig } from "./pattern.config";

const registry = createPatternRegistry(config, patternConfig);

const asData = (node: ComponentData): Data =>
  ({ content: [node], root: {} }) as unknown as Data;

const section = (id: string, body: ComponentData[]): ComponentData =>
  ({
    type: "Section",
    props: { id, theme: "personal", body },
  }) as unknown as ComponentData;

const heading = (id: string, text: string): ComponentData =>
  ({
    type: "Heading",
    props: { id, text, level: 2 },
  }) as unknown as ComponentData;

const text = (id: string, value: string): ComponentData =>
  ({ type: "Text", props: { id, text: value } }) as unknown as ComponentData;

const bodyOf = (node: ComponentData): ComponentData[] =>
  (node.props as unknown as { body: ComponentData[] }).body;

const childTypes = (node: ComponentData): string[] =>
  bodyOf(node).map((c) => c.type);

const applyReminted = (target: ComponentData, name: string): ComponentData => {
  const pattern = registry.findApplicable(target).find((p) => p.name === name);
  if (!pattern) throw new Error(`${name} not applicable to target`);
  const { data, preservedIds } = registry
    .apply(target, pattern)
    ._unsafeUnwrap();
  return remintIds(data, preservedIds);
};

describe("Almond Pattern palette", () => {
  const empty = section("sec-empty", []);

  test("all four domain-named patterns drop onto an empty Section", () => {
    expect(registry.findApplicable(empty).map((p) => p.name)).toEqual([
      "Section Intro",
      "Prose Block",
      "CTA Row",
      "Get the App",
    ]);
  });

  test("done-bar: dropping Section Intro onto an empty Section yields exactly Heading + Text", () => {
    const reminted = applyReminted(empty, "Section Intro");
    expect(reminted.type).toBe("Section");
    expect(reminted.props.id).toBe("sec-empty"); // the selected Section's id is preserved
    expect(childTypes(reminted)).toEqual(["Heading", "Text"]); // ghost CTA placeholder omitted
  });

  test("each signature injects onto an empty Section; generic re-home placeholders omit", () => {
    // Signature = unslotted → injects. Generic (slotted) placeholders omit when unmatched.
    expect(childTypes(applyReminted(empty, "Prose Block"))).toEqual(["Prose"]);
    expect(childTypes(applyReminted(empty, "CTA Row"))).toEqual([
      "Button",
      "Button",
    ]);
    expect(childTypes(applyReminted(empty, "Get the App"))).toEqual([
      "AppStoreBadges",
    ]);
  });

  test("every pattern applied to an empty Section produces globally-unique, non-template ids", () => {
    for (const pattern of registry.findApplicable(empty)) {
      const { data, preservedIds } = registry
        .apply(empty, pattern)
        ._unsafeUnwrap();
      const ids = allIds(asData(remintIds(data, preservedIds)));
      expect(new Set(ids).size).toBe(ids.length); // no collisions
      expect(ids.some((id) => id.startsWith("tmpl-"))).toBe(false); // no template literal survives
    }
  });

  test("injection: Get the App adds NEW badges over an existing heading + lede, ids preserved", () => {
    const fresh = section("sec-fresh", [
      heading("h-live", "Real headline"),
      text("t-live", "Real supporting line."),
    ]);
    const reminted = applyReminted(fresh, "Get the App");

    // the existing heading + lede are re-homed with their original ids (not reminted)…
    const head = bodyOf(reminted).find((c) => c.type === "Heading")!;
    expect(head.props.id).toBe("h-live");
    expect(head.props.text).toBe("Real headline");
    // …and the badges are the pattern's own injected signature.
    expect(childTypes(reminted)).toEqual(["Heading", "Text", "AppStoreBadges"]);
  });

  test("lossless gate: a signature-role collision withholds the injector but not the re-homer", () => {
    // A Section already holding a Heading: Section Intro's heading is its (unslotted) signature →
    // injecting would duplicate → withheld. Get the App / CTA Row slot the heading → re-home it.
    const withHeading = section("sec-h", [heading("h-x", "Existing")]);
    const names = registry.findApplicable(withHeading).map((p) => p.name);
    expect(names).toEqual(["CTA Row", "Get the App"]);
  });

  test("lossless gate: patterns are withheld when the Section holds unabsorbable content", () => {
    const withTable = section("sec-table", [
      {
        type: "ComparisonTable",
        props: {
          id: "ct-1",
          theme: "personal",
          comparisonSet: "banks",
          goal: "all",
        },
      } as unknown as ComponentData,
    ]);
    // No pattern slot accepts the "comparison" role → applying any would drop the table.
    expect(registry.findApplicable(withTable)).toEqual([]);
  });
});

describe("componentRoles completeness", () => {
  test("every registered component has a role (no undefined lookups)", () => {
    const unroled = Object.keys(config.components).filter(
      (type) => patternConfig.componentRoles[type] === undefined,
    );
    expect(unroled).toEqual([]);
  });
});
