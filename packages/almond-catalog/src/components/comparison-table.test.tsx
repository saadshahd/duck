import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { comparisons } from "../data/comparisons";
import { ComparisonTable } from "./comparison-table";

describe("ComparisonTable", () => {
  test("renders a themed table captioned from the data module", () => {
    const html = renderToStaticMarkup(
      <ComparisonTable theme="business" comparisonSet="send" goal="full" />,
    );
    expect(html).toContain('data-theme="business"');
    expect(html).toContain("almond-comparison");
    expect(html).toContain(comparisons.send.label);
  });

  test("highlights the Almond column internally, not by editor text", () => {
    const html = renderToStaticMarkup(
      <ComparisonTable theme="personal" comparisonSet="send" goal="full" />,
    );
    expect(html).toContain("data-almond");
    expect(html).toContain("Almond");
  });

  test("the goal lens narrows which capability rows render", () => {
    const html = renderToStaticMarkup(
      <ComparisonTable
        theme="personal"
        comparisonSet="send"
        goal="transparency"
      />,
    );
    expect(html).toContain("Real exchange rate");
    expect(html).not.toContain("Weekend transfers");
  });

  test("a dangling set renders a labeled placeholder, never crashes", () => {
    const html = renderToStaticMarkup(
      <ComparisonTable theme="personal" comparisonSet="ghost" goal="full" />,
    );
    expect(html).toContain("almond-comparison--missing");
    expect(html).toContain("ghost");
  });
});
