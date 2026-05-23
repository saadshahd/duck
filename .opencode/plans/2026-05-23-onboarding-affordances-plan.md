# Onboarding Affordances Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three-layer onboarding sequence (welcome overlay → element pulse → first-hover tooltip) to guide evaluators from "this looks like a website" to "this is an editor" without persistent chrome.

**Architecture:** Two demo-only components (WelcomeOverlay, ElementPulse) coordinate in the App component via sessionStorage gating. One product-level component (FirstHoverTooltip) ships with the editor library and self-gates via sessionStorage + useEditorInternals() for selection detection.

**Tech Stack:** React 19, TypeScript, CSS modules (co-located), bun:test for unit tests, Playwright for E2E tests.

---

## File Structure

### Demo-Only Files (Layer C + B)
- **Create:** `packages/editor/src/demo/welcome-overlay.tsx` — Full-screen welcome overlay component
- **Create:** `packages/editor/src/demo/welcome-overlay.css` — Overlay styles (fade animation, centered content)
- **Create:** `packages/editor/src/demo/element-pulse.tsx` — Element pulse manager component
- **Create:** `packages/editor/src/demo/element-pulse.css` — Pulse animation keyframes
- **Modify:** `packages/editor/src/demo/app.tsx` — Integrate overlay + pulse, manage onboarding state

### Product-Level Files (Layer A)
- **Create:** `packages/editor/src/editor/onboarding/first-hover-tooltip.tsx` — Tooltip component with cursor tracking
- **Create:** `packages/editor/src/editor/onboarding/first-hover-tooltip.css` — Tooltip styles (surface-bar theme, fade)
- **Create:** `packages/editor/src/editor/onboarding/index.ts` — Barrel export
- **Modify:** `packages/editor/src/editor/editor.tsx` — Render FirstHoverTooltip as child of Editor

### Test Files
- **Create:** `packages/editor/src/demo/welcome-overlay.test.ts` — Unit tests for overlay dismiss logic
- **Create:** `packages/editor/src/demo/element-pulse.test.ts` — Unit tests for pulse timing
- **Create:** `packages/editor/src/editor/onboarding/first-hover-tooltip.test.ts` — Unit tests for tooltip show/hide/dismiss
- **Create:** `packages/editor/src/editor/onboarding/onboarding.e2e.ts` — E2E tests for full sequence

---

## Task 1: Welcome Overlay (Layer C)

**Files:**
- Create: `packages/editor/src/demo/welcome-overlay.tsx`
- Create: `packages/editor/src/demo/welcome-overlay.css`
- Test: `packages/editor/src/demo/welcome-overlay.test.ts`

- [ ] **Step 1: Write failing test for overlay dismiss**

```typescript
// packages/editor/src/demo/welcome-overlay.test.ts
import { describe, it, expect } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { WelcomeOverlay } from "./welcome-overlay.js";

describe("WelcomeOverlay", () => {
  it("calls onDismiss when clicked", () => {
    let dismissed = false;
    const { container } = render(
      <WelcomeOverlay onDismiss={() => { dismissed = true; }} />
    );
    
    fireEvent.click(container.firstChild!);
    expect(dismissed).toBe(true);
  });

  it("calls onDismiss when key pressed", () => {
    let dismissed = false;
    const { container } = render(
      <WelcomeOverlay onDismiss={() => { dismissed = true; }} />
    );
    
    fireEvent.keyDown(container.firstChild!, { key: "Enter" });
    expect(dismissed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/editor/src/demo/welcome-overlay.test.ts`
Expected: FAIL with "Cannot find module './welcome-overlay.js'"

- [ ] **Step 3: Create welcome-overlay.css**

```css
/* packages/editor/src/demo/welcome-overlay.css */
.welcome-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: opacity 300ms ease;
  cursor: pointer;
}

.welcome-overlay--fading {
  opacity: 0;
  pointer-events: none;
}

.welcome-content {
  background: var(--surface-bar, rgba(17, 17, 17, 0.92));
  color: var(--text-bar, #f5f5f5);
  padding: 48px 64px;
  border-radius: 16px;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.welcome-heading {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 32px 0;
  color: var(--text-bar-strong, #ffffff);
}

.welcome-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0 0 32px 0;
  text-align: left;
}

.welcome-step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}

.welcome-step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.welcome-dismiss {
  font-size: 14px;
  color: var(--text-bar-muted, #a8a29e);
  margin: 0;
}
```

- [ ] **Step 4: Implement WelcomeOverlay component**

```tsx
// packages/editor/src/demo/welcome-overlay.tsx
import { useEffect, useRef, useState } from "react";
import "./welcome-overlay.css";

export function WelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [fading, setFading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDismiss = () => {
      setFading(true);
      setTimeout(onDismiss, 300);
    };

    const overlay = overlayRef.current;
    if (!overlay) return;

    overlay.addEventListener("click", handleDismiss);
    overlay.addEventListener("keydown", handleDismiss);
    overlay.addEventListener("touchstart", handleDismiss);

    return () => {
      overlay.removeEventListener("click", handleDismiss);
      overlay.removeEventListener("keydown", handleDismiss);
      overlay.removeEventListener("touchstart", handleDismiss);
    };
  }, [onDismiss]);

  return (
    <div
      ref={overlayRef}
      className={`welcome-overlay${fading ? " welcome-overlay--fading" : ""}`}
      tabIndex={0}
    >
      <div className="welcome-content">
        <h1 className="welcome-heading">The editor is the canvas.</h1>
        <div className="welcome-steps">
          <div className="welcome-step">
            <span className="welcome-step-number">1</span>
            <span>Click to select</span>
          </div>
          <div className="welcome-step">
            <span className="welcome-step-number">2</span>
            <span>Drag to reorder</span>
          </div>
          <div className="welcome-step">
            <span className="welcome-step-number">3</span>
            <span>Double-click to edit</span>
          </div>
        </div>
        <p className="welcome-dismiss">Click anywhere to start</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/editor/src/demo/welcome-overlay.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/demo/welcome-overlay.tsx packages/editor/src/demo/welcome-overlay.css packages/editor/src/demo/welcome-overlay.test.ts
git commit -m "feat(demo): add welcome overlay component"
```

---

## Task 2: Element Pulse (Layer B)

**Files:**
- Create: `packages/editor/src/demo/element-pulse.tsx`
- Create: `packages/editor/src/demo/element-pulse.css`
- Test: `packages/editor/src/demo/element-pulse.test.ts`

- [ ] **Step 1: Write failing test for pulse timing**

```typescript
// packages/editor/src/demo/element-pulse.test.ts
import { describe, it, expect, vi } from "bun:test";
import { render } from "@testing-library/react";
import { ElementPulse } from "./element-pulse.js";

describe("ElementPulse", () => {
  it("calls onPulseComplete after 1 second", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    
    render(<ElementPulse active={true} onPulseComplete={onComplete} />);
    
    expect(onComplete).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(1000);
    
    expect(onComplete).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });

  it("does not call onPulseComplete when inactive", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    
    render(<ElementPulse active={false} onPulseComplete={onComplete} />);
    
    vi.advanceTimersByTime(1000);
    
    expect(onComplete).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/editor/src/demo/element-pulse.test.ts`
Expected: FAIL with "Cannot find module './element-pulse.js'"

- [ ] **Step 3: Create element-pulse.css**

```css
/* packages/editor/src/demo/element-pulse.css */
[data-pulse="true"] [data-puck-component] {
  animation: duck-pulse 1s ease forwards;
  pointer-events: none;
}

@keyframes duck-pulse {
  0% {
    outline: 2px dashed transparent;
  }
  20% {
    outline: 2px dashed rgba(17, 17, 17, 0.18);
  }
  60% {
    outline: 2px dashed rgba(17, 17, 17, 0.18);
  }
  100% {
    outline: 2px dashed transparent;
  }
}
```

- [ ] **Step 4: Implement ElementPulse component**

```tsx
// packages/editor/src/demo/element-pulse.tsx
import { useEffect, useRef } from "react";
import "./element-pulse.css";

export function ElementPulse({
  active,
  onPulseComplete,
}: {
  active: boolean;
  onPulseComplete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    container.setAttribute("data-pulse", "true");

    const timeout = setTimeout(() => {
      container.removeAttribute("data-pulse");
      onPulseComplete();
    }, 1000);

    return () => {
      clearTimeout(timeout);
      container.removeAttribute("data-pulse");
    };
  }, [active, onPulseComplete]);

  return <div ref={containerRef} style={{ display: "contents" }} />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/editor/src/demo/element-pulse.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/demo/element-pulse.tsx packages/editor/src/demo/element-pulse.css packages/editor/src/demo/element-pulse.test.ts
git commit -m "feat(demo): add element pulse component"
```

---

## Task 3: First-Hover Tooltip (Layer A)

**Files:**
- Create: `packages/editor/src/editor/onboarding/first-hover-tooltip.tsx`
- Create: `packages/editor/src/editor/onboarding/first-hover-tooltip.css`
- Create: `packages/editor/src/editor/onboarding/index.ts`
- Test: `packages/editor/src/editor/onboarding/first-hover-tooltip.test.ts`

- [ ] **Step 1: Write failing test for tooltip visibility**

```typescript
// packages/editor/src/editor/onboarding/first-hover-tooltip.test.ts
import { describe, it, expect, vi, beforeEach } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { FirstHoverTooltip } from "./first-hover-tooltip.js";

// Mock useEditorInternals — will be overridden per test via module-level variable
let mockLastSelectedId: string | null = null;

vi.mock("../editor.js", () => ({
  useEditorInternals: () => ({
    currentData: {},
    lastSelectedId: mockLastSelectedId,
    commit: vi.fn(),
  }),
}));

describe("FirstHoverTooltip", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLastSelectedId = null;
  });

  it("shows tooltip on first mousemove when not onboarded", () => {
    const { queryByText } = render(<FirstHoverTooltip />);
    
    fireEvent.mouseMove(document.body, { clientX: 100, clientY: 100 });
    
    expect(queryByText(/Click any element to select/)).toBeTruthy();
  });

  it("does not show tooltip when already onboarded", () => {
    sessionStorage.setItem("duck:onboarded", "true");
    
    const { queryByText } = render(<FirstHoverTooltip />);
    
    fireEvent.mouseMove(document.body, { clientX: 100, clientY: 100 });
    
    expect(queryByText(/Click any element to select/)).toBeNull();
  });

  it("sets sessionStorage on auto-dismiss after 2s", async () => {
    vi.useFakeTimers();
    
    render(<FirstHoverTooltip />);
    
    fireEvent.mouseMove(document.body, { clientX: 100, clientY: 100 });
    
    vi.advanceTimersByTime(2300); // 2s timeout + 300ms fade
    
    expect(sessionStorage.getItem("duck:onboarded")).toBe("true");
    
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/editor/src/editor/onboarding/first-hover-tooltip.test.ts`
Expected: FAIL with "Cannot find module './first-hover-tooltip.js'"

- [ ] **Step 3: Create first-hover-tooltip.css**

```css
/* packages/editor/src/editor/onboarding/first-hover-tooltip.css */
.first-hover-tooltip {
  position: fixed;
  z-index: 9999998;
  background: var(--surface-bar, rgba(17, 17, 17, 0.92));
  color: var(--text-bar, #f5f5f5);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  opacity: 1;
  transition: left 150ms ease, top 150ms ease, opacity 300ms ease;
  white-space: nowrap;
}

.first-hover-tooltip--fading {
  opacity: 0;
}
```

- [ ] **Step 4: Create onboarding/index.ts**

```typescript
// packages/editor/src/editor/onboarding/index.ts
export { FirstHoverTooltip } from "./first-hover-tooltip.js";
```

- [ ] **Step 5: Implement FirstHoverTooltip component**

```tsx
// packages/editor/src/editor/onboarding/first-hover-tooltip.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorInternals } from "../editor.js";
import "./first-hover-tooltip.css";

export function FirstHoverTooltip() {
  const [onboarded, setOnboarded] = useState(
    () => sessionStorage.getItem("duck:onboarded") === "true",
  );
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { lastSelectedId } = useEditorInternals();
  const prevSelectedId = useRef(lastSelectedId);
  const dismissTimeoutRef = useRef<number>();

  const dismiss = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      setOnboarded(true);
      sessionStorage.setItem("duck:onboarded", "true");
    }, 300);
  }, []);

  // Detect selection change — dismiss tooltip if visible, or skip if not yet visible
  useEffect(() => {
    if (lastSelectedId && lastSelectedId !== prevSelectedId.current) {
      if (visible) {
        dismiss();
      } else if (!onboarded) {
        // Skip condition: user selected before tooltip appeared
        setOnboarded(true);
        sessionStorage.setItem("duck:onboarded", "true");
      }
    }
    prevSelectedId.current = lastSelectedId;
  }, [lastSelectedId, visible, onboarded, dismiss]);

  // Listen for first mousemove
  useEffect(() => {
    if (onboarded) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!visible) {
        setVisible(true);
        setPosition({ x: e.clientX + 16, y: e.clientY + 16 });

        // Auto-dismiss after 2 seconds
        dismissTimeoutRef.current = window.setTimeout(dismiss, 2000);
      } else {
        // CSS transition handles the 150ms lag — just update target position
        setPosition({ x: e.clientX + 16, y: e.clientY + 16 });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, [onboarded, visible, dismiss]);

  if (onboarded || !visible) return null;

  return (
    <div
      role="tooltip"
      className={`first-hover-tooltip${fading ? " first-hover-tooltip--fading" : ""}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      Click any element to select
      <br />
      Drag to move · ⌘D to duplicate
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test packages/editor/src/editor/onboarding/first-hover-tooltip.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/editor/src/editor/onboarding/
git commit -m "feat(editor): add first-hover tooltip component"
```

---

## Task 4: Integrate Layers in App Component

**Files:**
- Modify: `packages/editor/src/demo/app.tsx`
- Modify: `packages/editor/src/editor/editor.tsx`

- [ ] **Step 1: Modify app.tsx to integrate overlay + pulse**

```tsx
// packages/editor/src/demo/app.tsx
import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { config } from "./puck.config.js";
import { patternConfig } from "./pattern.config.js";
import { DemoEditor } from "../editor/demo-editor.js";
import { WelcomeOverlay } from "./welcome-overlay.js";
import { ElementPulse } from "./element-pulse.js";
import sampleData from "./sample-data.json";

const params = new URLSearchParams(window.location.search);
const bridge = (() => {
  const url = params.get("bridge") ?? "ws://localhost:4400";
  const page = params.get("page") ?? "landing";
  return { url, page };
})();

export function App() {
  const [data, setData] = useState<Data>(sampleData as Data);
  const [onboarded, setOnboarded] = useState(
    () => sessionStorage.getItem("duck:onboarded") === "true",
  );
  const [pulseActive, setPulseActive] = useState(false);

  const handleOverlayDismiss = () => {
    setOnboarded(true);
    setPulseActive(true);
    sessionStorage.setItem("duck:onboarded", "true");
  };

  const handlePulseComplete = () => {
    setPulseActive(false);
  };

  return (
    <>
      {!onboarded && <WelcomeOverlay onDismiss={handleOverlayDismiss} />}
      <ElementPulse active={pulseActive} onPulseComplete={handlePulseComplete} />
      <DemoEditor
        data={data}
        config={config}
        patternConfig={patternConfig}
        onChange={setData}
        bridge={bridge}
      />
    </>
  );
}
```

- [ ] **Step 2: Modify editor.tsx to render FirstHoverTooltip**

Find the import section (near the top where other editor modules are imported). Add this import after the existing overlay imports:

```tsx
import { FirstHoverTooltip } from "./onboarding/index.js";
```

Find the return statement where `<OverlayRoot>` is rendered. Add `<FirstHoverTooltip />` immediately after the closing `</OverlayRoot>` tag:

```tsx
      </OverlayRoot>
      <FirstHoverTooltip />
    </EditorInternalsContext.Provider>
```

- [ ] **Step 3: Run dev server to verify manually**

Run: `bun run dev`
Open: `http://localhost:5173`

Expected behavior:
1. Welcome overlay appears on load
2. Click/keypress dismisses overlay with fade
3. Element pulse runs for 1 second (all Puck elements briefly outlined)
4. Move mouse → tooltip appears near cursor, follows loosely
5. After 2 seconds OR click an element → tooltip fades out
6. Reload page → no onboarding layers appear (sessionStorage persists)

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/demo/app.tsx packages/editor/src/editor/editor.tsx
git commit -m "feat: integrate onboarding layers in demo and editor"
```

---

## Task 5: E2E Tests

**Files:**
- Create: `packages/editor/src/editor/onboarding/onboarding.e2e.ts`

- [ ] **Step 1: Write E2E test for full sequence**

```typescript
// packages/editor/src/editor/onboarding/onboarding.e2e.ts
import { test, expect } from "@playwright/test";

test.describe("Onboarding sequence", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => sessionStorage.clear());
  });

  test("shows welcome overlay on load", async ({ page }) => {
    await page.goto("/");
    
    const overlay = page.locator(".welcome-overlay");
    await expect(overlay).toBeVisible();
    await expect(page.locator(".welcome-heading")).toHaveText(
      "The editor is the canvas.",
    );
  });

  test("dismisses overlay on click and shows pulse", async ({ page }) => {
    await page.goto("/");
    
    const overlay = page.locator(".welcome-overlay");
    await overlay.click();
    
    // Overlay fades out
    await expect(overlay).not.toBeVisible({ timeout: 500 });
    
    // Pulse attribute is set
    const pulseContainer = page.locator('[data-pulse="true"]');
    await expect(pulseContainer).toBeAttached();
  });

  test("shows tooltip on mousemove after overlay dismiss", async ({ page }) => {
    await page.goto("/");
    
    // Dismiss overlay
    await page.locator(".welcome-overlay").click();
    await page.waitForTimeout(500); // Wait for fade + pulse
    
    // Move mouse
    await page.mouse.move(400, 300);
    
    // Tooltip appears
    const tooltip = page.locator(".first-hover-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Click any element to select");
  });

  test("dismisses tooltip on element selection", async ({ page }) => {
    await page.goto("/");
    
    // Dismiss overlay
    await page.locator(".welcome-overlay").click();
    await page.waitForTimeout(500);
    
    // Move mouse to show tooltip
    await page.mouse.move(400, 300);
    const tooltip = page.locator(".first-hover-tooltip");
    await expect(tooltip).toBeVisible();
    
    // Click an element (hero heading)
    await page.locator('[data-puck-component="Heading"]').first().click();
    
    // Tooltip dismissed
    await expect(tooltip).not.toBeVisible({ timeout: 500 });
  });

  test("skips onboarding on reload (sessionStorage persists)", async ({
    page,
  }) => {
    await page.goto("/");
    
    // Dismiss overlay
    await page.locator(".welcome-overlay").click();
    await page.waitForTimeout(500);
    
    // Reload
    await page.reload();
    
    // No overlay
    const overlay = page.locator(".welcome-overlay");
    await expect(overlay).not.toBeAttached();
  });

  test("skips tooltip if user clicks element before mousemove", async ({
    page,
  }) => {
    await page.goto("/");
    
    // Dismiss overlay
    await page.locator(".welcome-overlay").click();
    
    // Wait for pulse to complete (1s) + buffer
    await page.waitForTimeout(1100);
    
    // Click element immediately (before any mousemove)
    await page.locator('[data-puck-component="Heading"]').first().click();
    
    // Wait a moment
    await page.waitForTimeout(300);
    
    // Now move mouse
    await page.mouse.move(400, 300);
    
    // Tooltip should not appear (skip condition)
    const tooltip = page.locator(".first-hover-tooltip");
    await expect(tooltip).not.toBeAttached();
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `bunx playwright test packages/editor/src/editor/onboarding/onboarding.e2e.ts --project=chromium`
Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/onboarding/onboarding.e2e.ts
git commit -m "test: add E2E tests for onboarding sequence"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `bun test`
Expected: All tests PASS (including new welcome-overlay, element-pulse, first-hover-tooltip tests)

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No TypeScript errors

- [ ] **Step 3: Run all E2E tests**

Run: `bunx playwright test --project=chromium`
Expected: All E2E tests PASS (including new onboarding tests)

- [ ] **Step 4: Manual smoke test**

Run: `bun run dev`
Open: `http://localhost:5173`

Verify:
- Welcome overlay appears with correct styling
- Click dismisses with smooth fade
- Element pulse runs (brief outline on all components)
- Mouse movement triggers tooltip
- Tooltip follows cursor with lag
- Tooltip auto-dismisses after 2s
- Click element → tooltip dismisses early
- Reload → no onboarding (sessionStorage persists)
- Open in incognito → onboarding replays

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues from onboarding smoke test"
```

---

## Success Criteria

After completing all tasks:

1. Evaluators see the three-layer sequence on first load
2. All layers auto-dismiss without requiring explicit close buttons
3. Session gating prevents repeat onboarding in same tab
4. Zero persistent chrome after onboarding completes
5. All unit and E2E tests pass
6. TypeScript compiles without errors
