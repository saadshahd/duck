import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Heading, type HeadingLevel } from "./heading";

describe("Heading atom", () => {
  test("level selects the matching h{level} tag", () => {
    const levels: HeadingLevel[] = [1, 2, 3, 4];
    for (const level of levels) {
      const html = renderToStaticMarkup(<Heading level={level} text="x" />);
      expect(html).toContain(`<h${level}`);
    }
  });

  test("renders the text and tags the level for CSS", () => {
    const html = renderToStaticMarkup(
      <Heading level={2} text="Money you keep" />,
    );
    expect(html).toContain('data-level="2"');
    expect(html).toContain("Money you keep");
  });
});
