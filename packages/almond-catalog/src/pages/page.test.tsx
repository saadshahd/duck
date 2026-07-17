/**
 * Page-composition contract (sp-64 §1, §7.1, §3.4).
 *
 * The pages are data, so most of the done-bar is checkable as Data invariants without a DOM:
 * ids are unique-by-construction, every organism carries a valid theme, every shared/computed
 * reference resolves (never a dangling placeholder), and the mixed-theme page really mixes.
 * A render smoke through Puck's real `<Render>` guards against prop-name typos that would
 * silently render blank.
 */

import { Render } from "@puckeditor/core";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { allIds, preOrder } from "@duckeditor/spec";
import { resolveComparison } from "../data/comparisons";
import { resolveProduct } from "../data/products";
import { config } from "../puck.config";
import { THEMES } from "../tokens/themes";
import { assignIds } from "./page";
import { PAGES } from "./index";

const nodesOf = (page: (typeof PAGES)[number]) =>
  [...preOrder(page.data)].map((visit) => visit.component);

describe("assignIds", () => {
  test("mints an id on every node, including nested slot children", () => {
    const withIds = assignIds(
      [
        {
          type: "Section",
          props: {
            theme: "personal",
            body: [{ type: "Heading", props: { text: "Hi", level: 2 } }],
          },
        },
      ],
      "p",
    );
    expect(withIds[0].props.id).toBe("p-0");
    expect(
      (withIds[0].props.body as { props: { id: string } }[])[0].props.id,
    ).toBe("p-0-body-0");
  });

  test("leaves an empty slot array untouched (nothing to mint)", () => {
    const withIds = assignIds(
      [{ type: "Section", props: { theme: "personal", body: [] } }],
      "p",
    );
    expect(withIds[0].props.body).toEqual([]);
  });

  test("does not descend a non-slot record array (no `type` key)", () => {
    const snippets = [{ id: "aer" }, { id: "fx" }];
    const withIds = assignIds(
      [{ type: "DisclosureBand", props: { theme: "personal", snippets } }],
      "p",
    );
    expect(withIds[0].props.snippets).toEqual(snippets);
  });
});

describe("the 8 pages", () => {
  test("all 8 pages are present in IA order", () => {
    expect(PAGES.map((p) => p.id)).toEqual([
      "personal",
      "business",
      "card",
      "send",
      "interest",
      "security",
      "pricing",
      "comparison",
    ]);
  });

  test.each(PAGES.map((p) => [p.id, p] as const))(
    "%s: ids are unique across the document",
    (_id, page) => {
      const ids = allIds(page.data);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  test.each(PAGES.map((p) => [p.id, p] as const))(
    "%s: every top-level organism carries a valid theme",
    (_id, page) => {
      const themed = page.data.content.every(
        (node) => (node.props.theme as string) in THEMES,
      );
      expect(themed).toBe(true);
    },
  );

  test.each(PAGES.map((p) => [p.id, p] as const))(
    "%s: every shared ProductSummary resolves to a real product",
    (_id, page) => {
      const dangling = nodesOf(page)
        .filter((n) => n.type === "ProductSummary")
        .filter((n) => !resolveProduct(n.props.productId as string));
      expect(dangling).toEqual([]);
    },
  );

  test.each(PAGES.map((p) => [p.id, p] as const))(
    "%s: every ComparisonTable resolves to a real set",
    (_id, page) => {
      const dangling = nodesOf(page)
        .filter((n) => n.type === "ComparisonTable")
        .filter(
          (n) =>
            !resolveComparison(
              n.props.comparisonSet as string,
              n.props.goal as string,
            ),
        );
      expect(dangling).toEqual([]);
    },
  );

  test("ProductSummary appears across at least 6 contexts, one reference each", () => {
    const summaries = PAGES.flatMap(nodesOf).filter(
      (n) => n.type === "ProductSummary",
    );
    expect(summaries.length).toBeGreaterThanOrEqual(6);
    // "visibly one reference": a given id resolves to the same product name everywhere.
    const byId = new Map<string, string>();
    for (const s of summaries) {
      const id = s.props.productId as string;
      const name = resolveProduct(id)?.name ?? "";
      expect(byId.get(id) ?? name).toBe(name);
      byId.set(id, name);
    }
  });

  test("the Personal landing hosts a Business-themed section (mixed-theme, §7.1)", () => {
    const personal = PAGES.find((p) => p.id === "personal")!;
    const themes = new Set(personal.data.content.map((n) => n.props.theme));
    expect(themes.has("personal")).toBe(true);
    expect(themes.has("business")).toBe(true);
  });
});

describe("fixed app-shell chrome (§3.4)", () => {
  test("Header and Footer are not editor-reachable (unregistered)", () => {
    expect(config.components.Header).toBeUndefined();
    expect(config.components.Footer).toBeUndefined();
  });
});

describe("render smoke", () => {
  test.each(PAGES.map((p) => [p.id, p] as const))(
    "%s: renders through <Render> with no dangling placeholder",
    (_id, page) => {
      const html = renderToStaticMarkup(
        <Render config={config} data={page.data} />,
      );
      expect(html).not.toContain("Unknown product");
      expect(html).not.toContain("Unknown comparison");
      const headline = page.data.content[0].props.headline as string;
      expect(html).toContain(headline);
    },
  );
});
