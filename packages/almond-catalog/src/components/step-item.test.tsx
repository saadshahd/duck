import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StepItem, stepItemConfig } from "./step-item";

describe("StepItem auto-index", () => {
  test("the config exposes no index/n field — the editor never sets the number", () => {
    expect(Object.keys(stepItemConfig.fields ?? {})).toEqual([
      "heading",
      "text",
    ]);
  });

  test("the ordinal is not serialized into props: identical content renders identical markup", () => {
    const first = renderToStaticMarkup(<StepItem heading="A" text="x" />);
    const second = renderToStaticMarkup(<StepItem heading="A" text="x" />);
    expect(first).toEqual(second);
  });

  test("renders the badge scaffold the CSS counter paints, with no baked-in number", () => {
    const html = renderToStaticMarkup(<StepItem heading="Open" text="fast" />);
    expect(html).toContain("almond-step__badge");
    expect(html).not.toMatch(/almond-step__badge[^>]*>\s*\d/);
  });
});
