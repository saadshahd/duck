import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanCard } from "./plan-card";

const base = {
  tier: "Everyday",
  price: "Free",
  period: "forever",
  features: [{ label: "No monthly fee" }, { label: "Any currency" }],
  cta: { label: "Open", href: "/open" },
};

describe("PlanCard", () => {
  test("renders every feature and the CTA href", () => {
    const html = renderToStaticMarkup(<PlanCard {...base} highlight={false} />);
    expect(html).toContain("No monthly fee");
    expect(html).toContain("Any currency");
    expect(html).toContain('href="/open"');
  });

  test("highlight surfaces as a data attribute, not raw style", () => {
    const featured = renderToStaticMarkup(<PlanCard {...base} highlight />);
    const standard = renderToStaticMarkup(
      <PlanCard {...base} highlight={false} />,
    );
    expect(featured).toContain('data-highlight="true"');
    expect(standard).toContain('data-highlight="false"');
  });

  test("an empty features list renders no ghost bullets", () => {
    const html = renderToStaticMarkup(
      <PlanCard {...base} features={[]} highlight={false} />,
    );
    expect(html).toContain("almond-plan__features");
    expect(html).not.toContain("<li");
  });
});
