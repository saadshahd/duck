import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Text } from "./text";

describe("Text atom", () => {
  test("renders the copy inside a paragraph", () => {
    const html = renderToStaticMarkup(<Text text="Boring parts, solved." />);
    expect(html).toContain("<p");
    expect(html).toContain("Boring parts, solved.");
  });
});
