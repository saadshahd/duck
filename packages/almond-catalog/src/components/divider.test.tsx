import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Divider } from "./divider";

describe("Divider atom", () => {
  test("renders a semantic hr tagged with its variant", () => {
    const html = renderToStaticMarkup(<Divider variant="hairline" />);
    expect(html).toContain("<hr");
    expect(html).toContain('data-variant="hairline"');
  });

  test("defaults the variant to hairline when omitted", () => {
    const html = renderToStaticMarkup(<Divider />);
    expect(html).toContain('data-variant="hairline"');
  });
});
