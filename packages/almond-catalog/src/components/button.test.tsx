import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, type ButtonVariant } from "./button";

describe("Button atom", () => {
  test("renders a link to href carrying the label", () => {
    const html = renderToStaticMarkup(
      <Button label="Open an account" href="/signup" variant="primary" />,
    );
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Open an account");
  });

  test("tags the variant for CSS", () => {
    const variants: ButtonVariant[] = ["primary", "secondary", "ghost"];
    for (const variant of variants) {
      const html = renderToStaticMarkup(
        <Button label="x" href="#" variant={variant} />,
      );
      expect(html).toContain(`data-variant="${variant}"`);
    }
  });
});
