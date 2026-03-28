import { test, expect, type Page } from "@playwright/test";

// --- Shadow DOM helpers ---

async function shadowQuery(
  page: Page,
  fn: (root: ShadowRoot) => unknown,
): Promise<unknown> {
  return page.evaluate((fnStr) => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      return new Function("root", `return (${fnStr})(root)`)(d.shadowRoot);
    }
    return null;
  }, fn.toString());
}

const countButtons = (page: Page) =>
  shadowQuery(
    page,
    (r) => r.querySelectorAll("button").length,
  ) as Promise<number>;

const countHighlights = (page: Page) =>
  shadowQuery(
    page,
    (r) =>
      [...r.querySelectorAll("div")].filter((d) =>
        d.style.border?.includes("rgba(59, 130, 246"),
      ).length,
  ) as Promise<number>;

const highlightRect = (page: Page) =>
  shadowQuery(page, (r) => {
    for (const el of r.querySelectorAll("div")) {
      if (el.style.border?.includes("rgba(59, 130, 246"))
        return {
          top: el.style.top,
          left: el.style.left,
          width: el.style.width,
          height: el.style.height,
        };
    }
    return null;
  }) as Promise<{
    top: string;
    left: string;
    width: string;
    height: string;
  } | null>;

const clickFirstButton = (page: Page) =>
  page.evaluate(() => {
    for (const d of document.querySelectorAll("div")) {
      if (!d.shadowRoot || d.style.position !== "fixed") continue;
      d.shadowRoot.querySelector("button")?.click();
      return;
    }
  });

// --- Tests ---

test.describe("Editor overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("hover shows highlight, mouse away clears it", async ({ page }) => {
    await page.locator("h1").hover();
    await page.waitForTimeout(300);
    expect(await countHighlights(page)).toBe(1);

    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
    expect(await countHighlights(page)).toBe(0);
  });

  test("click shows floating action bar with 5 buttons", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);

    expect(await countButtons(page)).toBe(5);
    expect(await countHighlights(page)).toBe(1);
  });

  test("click empty space deselects", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);

    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    expect(await countButtons(page)).toBe(0);
    expect(await countHighlights(page)).toBe(0);
  });

  test("action bar clicks preserve selection", async ({ page }) => {
    await page.getByText("Zero Chrome", { exact: true }).click();
    await page.waitForTimeout(300);
    expect(await countButtons(page)).toBe(5);

    await clickFirstButton(page);
    await page.waitForTimeout(300);
    expect(await countButtons(page)).toBe(5);
  });

  test("hover different elements moves highlight", async ({ page }) => {
    await page.locator("h1").hover();
    await page.waitForTimeout(300);
    const rectA = await highlightRect(page);

    await page.getByText("Features", { exact: true }).hover();
    await page.waitForTimeout(300);
    const rectB = await highlightRect(page);

    expect(rectA).not.toBeNull();
    expect(rectB).not.toBeNull();
    expect(rectA).not.toEqual(rectB);
  });
});
