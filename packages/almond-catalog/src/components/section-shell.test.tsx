import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionShell } from "./section-shell";

const CSS = await Bun.file(
  new URL("./section-shell.css", import.meta.url).pathname,
).text();

describe("SectionShell primitive", () => {
  test("wires the chosen theme onto data-theme for the token block", () => {
    const html = renderToStaticMarkup(
      <SectionShell theme="business-forrest-blue">
        <p>body</p>
      </SectionShell>,
    );
    expect(html).toContain('data-theme="business-forrest-blue"');
    expect(html).toContain("body");
  });

  test("emits position:relative so the section anchors its own morph picker", () => {
    expect(CSS).toMatch(/\.almond-section\s*\{[^}]*position:\s*relative/);
  });
});
