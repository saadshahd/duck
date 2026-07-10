import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Prose } from "./prose";

describe("Prose atom", () => {
  test("renders the richtext HTML body verbatim", () => {
    const html = renderToStaticMarkup(
      <Prose body="<p>Hello <strong>world</strong></p>" />,
    );
    expect(html).toContain("<p>Hello <strong>world</strong></p>");
  });
});
