import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { products } from "../data/products";
import { ProductSummary } from "./product-summary";

describe("ProductSummary", () => {
  test("full-card path resolves the product name and blurb", () => {
    const html = renderToStaticMarkup(<ProductSummary productId="everyday" />);
    expect(html).toContain(products.everyday.name);
    expect(html).toContain(products.everyday.blurb);
    expect(html).toContain("almond-product--card");
  });

  test("compact-row path resolves the same product, different layout", () => {
    const html = renderToStaticMarkup(
      <ProductSummary productId="everyday" presentation="compact-row" />,
    );
    expect(html).toContain(products.everyday.name);
    expect(html).toContain("almond-product--row");
    expect(html).not.toContain(products.everyday.blurb);
  });

  test("a dangling id renders a labeled placeholder, never crashes", () => {
    const html = renderToStaticMarkup(<ProductSummary productId="ghost" />);
    expect(html).toContain("almond-product--missing");
    expect(html).toContain("ghost");
  });
});
