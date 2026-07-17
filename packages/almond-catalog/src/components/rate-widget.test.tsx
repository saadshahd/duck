import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RateWidget } from "./rate-widget";

describe("RateWidget", () => {
  test("static path shows the fixed conversion and the rate line, no input", () => {
    const html = renderToStaticMarkup(
      <RateWidget
        theme="personal"
        fromCurrency="USD"
        toCurrency="GBP"
        amount={1000}
      />,
    );
    // 1000 USD at 1 USD = 0.79 GBP → 790.00 GBP.
    expect(html).toContain("1000.00 USD");
    expect(html).toContain("790.00 GBP");
    expect(html).toContain("1 USD = 0.7900 GBP");
    expect(html).not.toContain("almond-rate__input");
  });

  test("interactive path adds a live amount input", () => {
    const html = renderToStaticMarkup(
      <RateWidget
        theme="personal"
        fromCurrency="USD"
        toCurrency="GBP"
        amount={1000}
        mode="interactive"
      />,
    );
    expect(html).toContain("almond-rate__input");
    expect(html).toContain('type="number"');
  });

  test("an unknown currency pair shows an honest fallback and retry, never a number", () => {
    const html = renderToStaticMarkup(
      <RateWidget
        theme="personal"
        fromCurrency="USD"
        toCurrency="XYZ"
        amount={1000}
      />,
    );
    expect(html).toContain("almond-rate--error");
    expect(html).toContain("unavailable");
    expect(html).toContain("Retry");
    expect(html).not.toContain("almond-rate__row");
  });
});
