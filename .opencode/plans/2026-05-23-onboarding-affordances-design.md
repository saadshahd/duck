# Onboarding Affordances Design

**Date:** 2026-05-23  
**Status:** Draft  
**Author:** Saad Shahd

## Problem Statement

Evaluators (PMs, designers, developers) viewing the Duck editor demo see a polished static landing page with no indication that it's an editable canvas. The rich interaction model (select, drag, inline edit, context menu, morph) is entirely gated behind a first interaction that never happens because nothing signals "this is interactive."

The editor's zero-chrome philosophy removes all persistent UI elements (no sidebar, no toolbar, no component panel), which creates a discoverability problem: users don't know where to start.

## Solution: Three-Layer Onboarding Sequence

A timed sequence of three ephemeral affordance layers that guide first-time users from "this looks like a website" to "this is an editor" without adding persistent chrome.

```
Page Load
  │
  ▼
[C] Welcome Overlay (full-screen, blocks canvas)
  │  user clicks or presses any key
  ▼
[B] Element Pulse (1s, all editable regions briefly glow)
  │  runs once, never repeats
  ▼
[A] First-hover Tooltip (appears on first mousemove over canvas)
  │  follows cursor ~2s, fades out
  │  OR dismissed immediately on first element selection
  ▼
  Ready state — zero chrome, full editor
```

### Session Gating

All three layers are gated by a single `sessionStorage` key: `duck:onboarded`.

- On page load, check for `duck:onboarded` in sessionStorage
- If absent: run the full C → B → A sequence
- If present: skip all layers, load directly into ready state
- After layer C dismisses, set `duck:onboarded = true` immediately (layers B and A are bonus cues, not required for gating)
- Reloading the page resets the session (new tab = fresh experience)

This ensures evaluators see the onboarding on first view, but returning users in the same session aren't interrupted.

**Edge case:** If a user dismisses the overlay (setting the key) but closes the tab before Layer A fires, reopening in a new tab will replay the sequence. Reopening in the same tab (back/forward) skips all layers. This is acceptable — they already saw Layers C+B.

---

## Layer C: Welcome Overlay (Demo-Only)

### Purpose

Guarantees evaluators see the core interaction model before they start exploring. Provides explicit instruction on the three primary actions: select, drag, edit.

### Scope

**Demo-only.** Lives in `packages/editor/src/demo/welcome-overlay.tsx`. Not part of the editor library.

**Rationale:** Product consumers embed the editor in their own applications and control their own onboarding flows. This overlay is specific to the standalone demo experience.

### Visual Design

Full-screen semi-transparent overlay:
- Background: `rgba(0,0,0,0.6)`
- Centered content using editor design tokens (`--surface-bar`, `--text-bar`)
- Heading: "The editor is the canvas." (reuses sample data hero text)
- Three numbered steps in a card-style container:
  1. Click to select
  2. Drag to reorder
  3. Double-click to edit
- Dismiss prompt at bottom: "Click anywhere to start"
- No close button — entire overlay is the dismiss target

### Behavior

1. Renders on page load when `duck:onboarded` is absent
2. Blocks pointer events to the canvas (user cannot interact with editor until dismissed)
3. Dismisses on: any click, keypress, or touch
4. Fade-out animation: 300ms ease
5. After dismissal, triggers Layer B (Element Pulse)

### Implementation

```tsx
// packages/editor/src/demo/welcome-overlay.tsx
export function WelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  // Full-screen fixed overlay
  // Listens for click/keydown/touchstart on the overlay container
  // Calls onDismiss() on any interaction
  // Uses CSS transition for fade-out
}
```

Rendered in `App` component:

```tsx
// packages/editor/src/demo/app.tsx
const [onboarded, setOnboarded] = useState(
  () => sessionStorage.getItem('duck:onboarded') === 'true'
);

function handleDismiss() {
  setOnboarded(true);
  sessionStorage.setItem('duck:onboarded', 'true');
}

return (
  <>
    {!onboarded && <WelcomeOverlay onDismiss={handleDismiss} />}
    <Editor ... />
  </>
);
```

---

## Layer B: Element Pulse (Demo-Only)

### Purpose

Immediately after the welcome overlay dismisses, visually signals which regions of the page are interactive. Catches attention on a static screen before the user has moved the mouse.

### Scope

**Demo-only.** Lives in `packages/editor/src/demo/element-pulse.tsx`. Not part of the editor library.

**Rationale:** Like the welcome overlay, this is a demo-specific attention-grabber. Product consumers have their own context for introducing the editor.

### Visual Design

All Puck-managed elements (elements with `data-puck-component` attribute) receive a brief outline animation:

- Outline: `2px dashed rgba(17,17,17,0.18)` (uses `--accent-hover` color)
- Border-radius: `4px`
- Animation timing:
  - 0% → 20% (200ms): fade in from transparent
  - 20% → 60% (400ms): hold at full opacity
  - 60% → 100% (400ms): fade out to transparent
- Total duration: 1 second
- Runs once, never repeats

### Behavior

1. Triggers immediately after welcome overlay dismissal
2. Applies `data-pulse="true"` attribute to the editor container
3. CSS targets all `[data-puck-component]` descendants with the pulse animation
4. Uses `pointer-events: none` to avoid interfering with early mouse interactions
5. After animation completes (1s), removes the `data-pulse` attribute
6. Does not block user interaction — user can click/drag during the pulse

### Implementation

```tsx
// packages/editor/src/demo/element-pulse.tsx
export function ElementPulse({ 
  active, 
  onPulseComplete 
}: { 
  active: boolean;
  onPulseComplete: () => void;
}) {
  // When active=true, sets data-pulse="true" on a wrapper div
  // Manages its own 1s timeout internally
  // After timeout, removes the attribute and calls onPulseComplete()
  // Returns null (no visible DOM, just manages the attribute)
}
```

CSS (injected via style tag or CSS module):

```css
[data-pulse="true"] [data-puck-component] {
  animation: duck-pulse 1s ease forwards;
  pointer-events: none;
}

@keyframes duck-pulse {
  0%   { outline: 2px dashed transparent; }
  20%  { outline: 2px dashed rgba(17,17,17,0.18); }
  60%  { outline: 2px dashed rgba(17,17,17,0.18); }
  100% { outline: 2px dashed transparent; }
}
```

Rendered in `App`:

```tsx
// packages/editor/src/demo/app.tsx
const [pulseActive, setPulseActive] = useState(false);

function handleOverlayDismiss() {
  setOnboarded(true);
  setPulseActive(true);
  sessionStorage.setItem('duck:onboarded', 'true');
  
  // Pulse auto-deactivates after 1s via ElementPulse component
}

return (
  <>
    {!onboarded && <WelcomeOverlay onDismiss={handleOverlayDismiss} />}
    <ElementPulse active={pulseActive} onPulseComplete={() => setPulseActive(false)} />
    <Editor ... />
  </>
);
```

---

## Layer A: First-Hover Tooltip (Product-Level)

### Purpose

Provides contextual instruction at the exact moment the user is about to interact. Meets them at the first mouse movement with actionable guidance.

### Scope

**Product-level.** Lives in `packages/editor/src/editor/onboarding/first-hover-tooltip.tsx`. Ships with the editor library.

**Rationale:** Unlike the overlay and pulse, this is a lightweight, non-intrusive cue that benefits any first-time user, not just demo evaluators. It's subtle enough to ship in production without feeling like hand-holding.

### Visual Design

Small dark tooltip positioned near the cursor:

```
┌──────────────────────────────────┐
│  Click any element to select     │
│  Drag to move · ⌘D to duplicate  │
└──────────────────────────────────┘
```

- Surface: `--surface-bar` (rgba(17,17,17,0.92))
- Text: `--text-bar` (#f5f5f5)
- Border-radius: 8px
- Box shadow: subtle (consistent with action bar)
- Font size: 13px
- Position: 16px below and to the right of cursor
- Follows cursor with 150ms lag (smooth, not jittery)

### Behavior

1. **Trigger:** First `mousemove` event on the canvas after page load (when `duck:onboarded` is absent)
2. **Display:** Tooltip appears immediately on first mousemove
3. **Tracking:** Follows cursor position, throttled to requestAnimationFrame, with 150ms lag for smoothness
4. **Auto-dismiss:** Fades out after 2 seconds (300ms fade animation)
5. **Early dismiss:** Dismisses immediately if user selects an element (listens for `SELECT` event from XState machine)
6. **Skip condition:** If user is already interacting (clicking, typing, dragging) before the tooltip would appear, skip it entirely — don't interrupt active use
7. **Session gating:** After dismissal (auto or early), set `duck:onboarded = true` in sessionStorage

### Implementation

The tooltip is rendered as a child of `<Editor>`, giving it access to `useEditorInternals()` for selection detection.

```tsx
// packages/editor/src/editor/onboarding/first-hover-tooltip.tsx
export function FirstHoverTooltip() {
  const [onboarded, setOnboarded] = useState(
    () => sessionStorage.getItem('duck:onboarded') === 'true'
  );
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { lastSelectedId } = useEditorInternals();
  const prevSelectedId = useRef(lastSelectedId);

  // Detect selection change: if lastSelectedId changed from null to a value,
  // the user selected an element — dismiss tooltip early
  useEffect(() => {
    if (lastSelectedId && lastSelectedId !== prevSelectedId.current && visible) {
      dismiss();
    }
    prevSelectedId.current = lastSelectedId;
  }, [lastSelectedId]);

  // Listen for first mousemove on canvas
  // Set visible=true, start tracking position (rAF-throttled, 150ms lag)
  // Auto-dismiss after 2s timeout via setTimeout
  // On dismiss: fade out (300ms), set sessionStorage, setOnboarded(true)

  if (onboarded || !visible) return null;

  return (
    <div role="tooltip" style={{ position: 'fixed', left: position.x + 16, top: position.y + 16 }}>
      Click any element to select<br />
      Drag to move · ⌘D to duplicate
    </div>
  );
}
```

Integration in `Editor` component — the tooltip is always rendered; it self-gates via `useState`:

```tsx
// packages/editor/src/editor/editor.tsx
export function Editor({ data, config, onChange, ... }) {
  return (
    <>
      {/* ... existing editor layers ... */}
      <FirstHoverTooltip />
    </>
  );
}
```

**Why self-gating:** The tooltip reads `sessionStorage` once in a `useState` initializer (not during render), so it's reactive to its own state changes. It uses `useEditorInternals()` (the public hook) to detect selection changes without needing access to the internal XState `send`/`state`.

### Risk Mitigation

- **Intrusiveness:** Tooltip is small, dark, and follows cursor loosely. Doesn't block interaction.
- **Missed tooltip:** If user moves mouse very fast, tooltip may not be noticed. Acceptable — Layer B (pulse) already signaled interactivity.
- **Interruption:** Skip condition prevents tooltip from appearing if user is already actively clicking/typing.

---

## Implementation Considerations

### Coordination Between Layers

The three layers are coordinated in the demo `App` component:

1. `App` manages `onboarded` and `pulseActive` state
2. `WelcomeOverlay` calls `onDismiss` → sets `onboarded=true`, `pulseActive=true`
3. `ElementPulse` runs for 1s, then calls `onPulseComplete` → sets `pulseActive=false`
4. `FirstHoverTooltip` is rendered inside `Editor` and self-manages based on sessionStorage

The `Editor` component doesn't know about layers C and B. It only renders layer A based on the sessionStorage key.

### Testing Strategy

**Unit tests (bun:test):**
- Session gating logic: verify sessionStorage key is checked and set correctly
- Tooltip positioning: verify 16px offset from cursor
- Auto-dismiss timing: verify 2s timeout triggers fade-out

**E2E tests (Playwright):**
- Full sequence: load page → see overlay → dismiss → see pulse → move mouse → see tooltip → select element → tooltip dismissed
- Session persistence: reload page in same tab → no onboarding layers appear
- Skip condition: dismiss overlay then click element before moving mouse → tooltip never appears

### Accessibility

- Welcome overlay: dismissible via keyboard (any key), not just mouse
- Element pulse: purely visual, no accessibility concerns (doesn't block interaction)
- First-hover tooltip: purely visual cue (not announced to screen readers). Uses sufficient color contrast (dark surface, light text). No `aria-describedby` needed since the tooltip has no persistent target element — it follows the cursor.

### Performance

- Welcome overlay: single full-screen div, negligible cost
- Element pulse: CSS animation on all Puck elements, runs once for 1s. No JS overhead after triggering.
- First-hover tooltip: rAF-throttled position tracking, unmounts after dismissal. No ongoing cost.

---

## Alternatives Considered

### Persistent Toolbar or Sidebar

**Rejected.** Violates zero-chrome philosophy. Adds permanent UI that clutters the canvas.

### Interactive Tutorial (Step-by-Step Guidance)

**Rejected.** Too heavy for evaluators. People skip tutorials. The three-layer sequence is faster and less intrusive.

### Cursor Change on Hover

**Considered but insufficient.** Changing cursor to `pointer` on hover is subtle but doesn't tell users *what* to do. The tooltip provides explicit instruction.

### Empty State with "Add Your First Element"

**Not applicable.** The demo loads with pre-built sample data, not an empty canvas. Empty state handling is a separate concern.

---

## Success Criteria

After implementing this design, evaluators should:

1. **Immediately understand** the page is editable (within 3 seconds of load)
2. **Successfully perform** the core interaction loop: click → select → drag → reorder
3. **All three layers auto-dismiss** without requiring a close button or explicit dismissal gesture beyond the natural interaction they cue

The demo should feel like "magic" — the page comes alive and invites interaction without explicit instruction beyond the initial three-layer sequence.
