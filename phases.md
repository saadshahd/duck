# Implementation Phases

Each phase is a self-contained prompt. Read `CLAUDE.md` before starting any phase.

---

## Phase 1: Overlay System

### Goal
When hovering over rendered components, a subtle boundary glow appears. Clicking selects the element and shows a floating action bar near it. All editor UI lives in a Shadow DOM so it can't be affected by catalog component styles.

### What to build

**1. Shadow DOM overlay layer**
- Use `react-shadow` (v20.6+) to create an overlay `<div>` with an **open** Shadow DOM that sits on top of the rendered json-render output.
- The overlay is absolutely positioned to cover the full viewport.
- It has `pointer-events: none` by default — pointer events pass through to the rendered components underneath.
- Individual overlay elements (selection ring, floating bar) have `pointer-events: auto`.

**2. Editor overlay CSS**
- Plain CSS in `editor-overlay.css`, injected into the shadow root via `adoptedStyleSheets` (constructable stylesheets).
- In Vite, import the CSS as a string (`?inline` suffix), create a `CSSStyleSheet`, call `sheet.replaceSync(css)`, and assign to `shadowRoot.adoptedStyleSheets`.
- Design tokens defined as CSS custom properties on `:host`, sourced from `.interface-design/system.md`.

**3. Element hit-testing**
- Intercept `mousemove` and `click` events on the rendered component area (outside the shadow root).
- Use `document.elementFromPoint(x, y)` to find the DOM element under the cursor.
- Walk up the DOM from the hit element to find the nearest json-render element boundary. json-render's `Renderer` should assign `data-element-id` attributes (check if it does — if not, wrap each element in a thin `<div data-element-id={id}>` in the registry layer).
- On hover: read the element's `getBoundingClientRect()` and draw a glow outline in the Shadow DOM overlay at that position. Use a `<div>` with `position: absolute`, `border: 2px solid rgba(59, 130, 246, 0.5)`, `border-radius: 4px`, `transition: all 150ms ease`. Remove when mouse leaves.
- On click: mark the element as selected. Selection state = `{ elementId: string, rect: DOMRect }`.

**4. Floating action bar**
- Use `@floating-ui/react` (v0.27+) to position a small toolbar near the selected element.
- The floating bar renders inside the Shadow DOM overlay.
- Buttons: [↑ move up] [↓ move down] [× delete] [✏ edit] [⋮ more]. These are stubs in Phase 1 — just log the action to console.
- The bar uses `autoPlacement` or `flip` + `shift` from floating-ui to stay visible.
- Click outside the selected element → deselect → floating bar disappears.
- **Open shadow DOM required** — closed shadow DOM breaks floating-ui positioning.

### Libraries
- `react-shadow` — Shadow DOM wrapper
- `@floating-ui/react` — floating bar positioning

### Constraints
- Editor overlay CSS must NOT leak into rendered catalog components.
- Catalog component CSS must NOT affect the editor overlay.
- No persistent UI — everything appears on hover/click, disappears on deselect.
- Catalog-agnostic — hit-testing works by element ID, never by component type.

### Verification
1. Hover over any rendered component → blue glow outline appears, follows the element bounds exactly.
2. Move mouse away → glow disappears.
3. Click a component → glow stays, floating bar appears near it with 5 buttons.
4. Click empty space → selection clears, floating bar disappears.
5. Load a catalog with aggressive global CSS (e.g., `* { border: 5px solid red }`) → editor overlay renders correctly, unaffected.
6. Floating bar stays in viewport when selecting elements near edges (flip/shift working).

---

## Phase 2: Direct Manipulation

### Goal
Designers can reorder sections by dragging, edit text inline by double-clicking, and the editor tracks interaction modes via a state machine.

### What to build

**1. XState editor state machine**
- Use XState v5 + `@xstate/react` v6.
- States: `idle` → `hovering` → `selecting` → `dragging` → `textEditing`.
- Transitions:
  - `idle` + mousemove over element → `hovering` (show glow)
  - `hovering` + mouseleave → `idle` (hide glow)
  - `hovering` + click → `selecting` (show floating bar)
  - `selecting` + click outside → `idle`
  - `selecting` + drag handle mousedown → `dragging`
  - `dragging` + drop → `selecting` (element reordered)
  - `selecting` + double-click on text prop → `textEditing`
  - `textEditing` + Enter/Escape → `selecting`
- Context: `{ hoveredElementId, selectedElementId, dragState, editingPropKey }`.
- The machine is the single source of truth for what the editor is doing. All Phase 1 hover/select logic migrates into this machine.

**2. Drag-to-reorder**
- Use `@atlaskit/pragmatic-drag-and-drop` (v1.7+).
- Only siblings can be reordered (drag within the same parent's children array).
- When dragging starts: render drop indicators (horizontal lines) between sibling elements in the overlay.
- When dropped: update the json-render `Spec` by reordering the `children` array of the parent element. Use `@json-render/core`'s patch utilities if available, otherwise mutate immutably (spread + splice).
- The drag overlay (ghost element) renders at `document.body` level, outside the shadow root — pragmatic-drag-and-drop is framework-agnostic and handles this.
- Animate the reorder with `motion` (v12, via `LazyMotion` for small bundle). Use `layout` animation on sibling elements so they flow smoothly when one is removed/inserted.

**3. Inline text editing**
- Research the best inline text editing library for this use case. Requirements: lightweight, works in React 19, can be activated programmatically on a specific DOM element, commits on Enter, cancels on Escape. Candidates to evaluate:
  - Simple `contenteditable` + manual event handling (lightest, most control)
  - `tiptap` (ProseMirror-based — powerful but may be overkill for single-field editing)
  - `@lexical/react` (Meta's editor — good React integration)
  - `react-contenteditable` (thin wrapper)
- For V1, the scope is editing **string props** only (e.g., `heading.text`, `button.label`). Not rich text.
- Double-click a text element → the text becomes editable in-place. The element's actual DOM text node becomes contenteditable (or an input overlays it).
- Enter → commit the new value back to the `Spec` (update the element's prop). Escape → revert.
- The edited text must appear in exactly the same position, font, and size as the rendered component's text — no visual jump.

### Libraries
- `xstate` v5 + `@xstate/react` v6 — state machine
- `@atlaskit/pragmatic-drag-and-drop` v1 — drag-and-drop
- `motion` v12 — reorder animation
- TBD: inline text editing (research during implementation)

### Constraints
- Reorder only within siblings — no cross-parent moves in Phase 2.
- Text editing applies to string props only — no rich text, no nested content.
- Every edit updates the `Spec` immutably (new object, not mutation).
- State machine is the single source of truth — no ad-hoc `useState` for interaction modes.

### Verification
1. Drag a section → drop indicator appears between siblings → drop → section moves → `Spec` updated.
2. Drag animation is smooth (elements flow, no teleporting).
3. Double-click heading text → text becomes editable → type → Enter → text updates in the Spec.
4. Double-click → type → Escape → text reverts to original.
5. Cannot drag while text editing is active (states are exclusive).
6. XState inspector/devtools shows the correct state transitions.

---

## Phase 3: History

### Goal
Every edit produces an immutable snapshot. Cmd+Z undoes, Cmd+Shift+Z redoes. Designers can name checkpoints and restore them.

### What to build

**1. Snapshot system**
- A snapshot is `{ spec: Spec, label: string, timestamp: number }`.
- Maintain a linear history stack: `Array<Snapshot>` + a `currentIndex` pointer.
- Every mutation (reorder, text edit, patch from MCP) pushes a new snapshot.
- If `currentIndex` is not at the end (user has undone), new edits discard the future (standard linear undo).
- Labels are auto-generated from the action: "Reordered [elementType] in [parentType]", "Edited text: [truncated value]", "Agent: applied N patches".
- Use `structuredClone` to snapshot the `Spec` — json-render specs are plain JSON, so this is safe and fast.

**2. Undo/redo**
- `Cmd+Z` → decrement `currentIndex`, render the previous snapshot's Spec.
- `Cmd+Shift+Z` → increment `currentIndex`, render the next snapshot's Spec.
- Register keyboard shortcuts via `useEffect` + `keydown` listener. Respect `e.metaKey` (Mac) and `e.ctrlKey` (Windows/Linux).
- When undoing/redoing: preserve scroll position, preserve selection if the selected element still exists in the new Spec.

**3. Named checkpoints**
- A checkpoint is a snapshot with `isCheckpoint: true` and a user-provided name.
- Create via the floating bar [⋮] menu → "Save checkpoint" → prompt for name (simple inline input, not a modal).
- Checkpoints are visually distinct in the history overlay.

**4. History overlay**
- Accessed from the floating bar [⋮] → "History" or via keyboard shortcut (Cmd+Shift+H or similar).
- Renders inside the Shadow DOM overlay as a panel that slides in from the right edge.
- Shows a list of actions (most recent first) with labels and timestamps.
- Checkpoints are highlighted (different background, pin icon).
- Click any entry → restore to that snapshot.
- Close button or Escape → overlay disappears, back to the page.
- **This is the ONE exception to zero-chrome** — it's an overlay that appears on demand and disappears when closed. Not a persistent panel.

### Constraints
- Snapshots are `structuredClone` of the `Spec` — no shared references, no mutation risk.
- History cap: keep last 100 snapshots max to bound memory. Checkpoints are exempt from eviction.
- The history overlay is inside the Shadow DOM — isolated from catalog CSS.
- Undo/redo must not cause full page re-renders. Use element IDs as React keys.

### Verification
1. Make 3 edits → Cmd+Z three times → back to original state.
2. Cmd+Shift+Z → redoes correctly.
3. Undo twice → make a new edit → redo stack is discarded (can't redo the old future).
4. Create a checkpoint "Before pricing experiment" → make edits → open history → click checkpoint → state restored.
5. History overlay shows labeled entries in correct order with timestamps.
6. Scroll position preserved across undo/redo.

---

## Phase 4: MCP Server

### Goal
AI agents (Claude Code, Cursor, etc.) connect to the editor via MCP. They can read the document, apply patches, query the catalog, and see what the designer has selected.

### What to build

**1. MCP server setup**
- Use Bun as runtime, `@modelcontextprotocol/sdk` (v1.28+) for protocol, `effect` (v3) for structured concurrency and pipelines.
- Entry point: `packages/mcp-server/src/index.ts`.
- Server runs as stdio transport (standard for Claude Code / `.mcp.json` integration).
- On startup: discover the editor's running preview server (WebSocket connection).

**2. Preview server (WebSocket bridge)**
- A Bun HTTP + WebSocket server that bridges between the editor (browser) and the MCP server.
- The editor connects via WebSocket on load. One connection per page.
- Messages from MCP server → editor: `{ type: "apply-patches", patches }`, `{ type: "request-capture" }`, `{ type: "request-selection" }`.
- Messages from editor → MCP server: `{ type: "spec-updated", spec }`, `{ type: "selection-changed", selection }`, `{ type: "capture-response", image }`.
- Port: OS-assigned (port 0), reported in `editor_status`.

**3. MCP tools**

`editor_status` (read):
- Returns: server health, preview URL, loaded page info, last designer selection (60s TTL).

`editor_catalog` (read):
- Multi-modal query tool. Input modes (priority order):
  1. `component: string` → returns that component's Zod schema as JSON Schema
  2. `components: string[]` → batch fetch, unknown types reported in errors
  3. `search: string` → fuzzy match name/description
  4. `summary` (default) → all components grouped by category
- Uses `catalog.jsonSchema()` and `catalog.prompt()` from `@json-render/core`.

`editor_apply` (write):
- Input: array of RFC 6902 JSON Patch operations targeting the Spec.
- Apply atomically using `@json-render/core`'s `applySpecPatch`. On failure: rollback, return error with op index.
- On success: push new Spec to editor via WebSocket, save to disk (`.json-render-editor/pages/{page}/document.json`), return touched element IDs + preview URL.
- Validate touched elements against catalog (advisory, non-blocking).
- Use atomic file writes (write to `.tmp`, rename).

`editor_selection` (read):
- Returns the designer's current selection: element ID, element type, props, ancestor chain.
- Selection pushed from editor via WebSocket, cached with 60s TTL.
- Returns `null` if no selection or TTL expired.

`editor_capture` (read):
- Requests a screenshot from the browser via WebSocket RPC (message ID correlation).
- Returns base64 PNG.
- 10-second timeout.
- Optional: `include: ['dom']` for HTML snapshot, `include: ['props']` + `nodeId` for resolved props.

`editor_history` (read/write):
- `list` mode: returns checkpoint names + timestamps.
- `restore` mode: restores to a named checkpoint (pushes command to editor via WebSocket).
- History state lives in the editor (browser) — MCP server proxies commands.

**4. Filesystem persistence**
- Pages stored at `.json-render-editor/pages/{page}/document.json` relative to project root.
- Page names: kebab-case, `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, max 64 chars.
- Atomic writes: write `.tmp` → rename.
- On MCP server startup: restore pages from disk into memory.

### Libraries
- `effect` v3 — structured concurrency, resource management, pipelines
- `@modelcontextprotocol/sdk` v1 — MCP protocol
- `@json-render/core` — catalog queries, spec operations
- `zod` — tool input validation

### Patterns from ui-ai to follow
- Tool context as mutable ref (`{ current: ToolContext }`) — reload updates state without recreating tools.
- Multi-modal query tools (one tool, multiple input modes) — avoids tool explosion.
- Atomic patch application with rollback and error hints (available IDs on NOT_FOUND).
- Validation scoped to touched elements (advisory, non-blocking).

### Patterns from ui-ai to skip
- No legacy connection models. One WebSocket per page, period.
- No dual file watchers. One watcher, multiple handlers.
- No MCP resources — tools are sufficient.
- No JIT rendering for capture — editor is always live.

### Constraints
- Effect v3 is for the MCP server only. No Effect in the editor bundle.
- Use `neverthrow` for Result types in tool handlers where Effect is overkill.
- MCP tools must be idempotent where labeled "read". Only `editor_apply` and `editor_history:restore` mutate state.

### Verification
1. Start MCP server → Claude Code sees it in `.mcp.json` → `editor_status` returns health info.
2. `editor_catalog` with `summary` mode → returns all demo catalog components grouped.
3. `editor_apply` with a valid patch → editor updates live, file saved to disk.
4. `editor_apply` with an invalid patch → error returned with op index, no state change.
5. Select an element in the editor → `editor_selection` returns its context within 60s.
6. `editor_capture` → returns a base64 PNG of the current page.
7. Create a checkpoint → `editor_history:list` → shows it → `editor_history:restore` → state reverts.

---

## Phase 5: Stable Updates

### Goal
When the AI agent applies patches via MCP, the page updates without disturbing the designer. No scroll jumps, no selection loss, no flicker.

### What to build

**1. Stable React keys**
- Ensure the json-render `Renderer` uses element IDs as React keys. Check if `@json-render/react` does this by default. If not, wrap the registry to inject `key={elementId}` on each rendered element.
- This ensures React reconciles elements by identity, not by position — moving an element in the children array doesn't destroy and recreate it.

**2. Scroll position preservation**
- Before applying a Spec update from MCP: record `window.scrollY` (or the scroll container's `scrollTop`).
- After React re-renders with the new Spec: restore the scroll position.
- Use `requestAnimationFrame` or `useLayoutEffect` to restore before the browser paints.
- Edge case: if the element above the viewport was deleted, the viewport may shift. Anchor to the first visible element instead of absolute scroll position.

**3. Selection preservation**
- Before applying a Spec update: record `selectedElementId` from the XState machine.
- After update: if the element still exists in the new Spec, keep it selected and reposition the floating bar. If deleted, deselect.
- The floating bar position may need to update (element may have moved). Recalculate `getBoundingClientRect` after render.

**4. Change highlight animation**
- When a Spec update arrives from MCP, diff the old and new Spec to find which elements changed (added, updated, removed).
- Use `@json-render/core`'s `diffToPatches` if available, otherwise diff the `elements` maps.
- For changed elements: apply a brief glow animation (0.5s, subtle blue pulse) via the Shadow DOM overlay.
- For added elements: brief fade-in animation.
- For removed elements: brief fade-out before removal (if possible with React's reconciliation — may need `AnimatePresence` from `motion`).
- Animations are non-blocking — they don't prevent the designer from interacting.

### Libraries
- `motion` v12 — change highlight animations, `AnimatePresence` for exit animations
- `@json-render/core` — `diffToPatches` for change detection

### Constraints
- No full page re-renders. React's reconciliation + stable keys handles partial updates.
- Scroll preservation must work even when elements above the viewport change size.
- Animation must be subtle — a brief glow, not a jarring flash. Duration: 300-500ms. Color: `rgba(59, 130, 246, 0.15)` background pulse.

### Verification
1. Scroll to middle of page → agent applies patch to hero (above viewport) → scroll position unchanged.
2. Select a card → agent updates the card's text → card stays selected, floating bar repositions correctly.
3. Agent adds a new section → it fades in with subtle animation.
4. Agent updates a heading → the heading glows briefly, then returns to normal.
5. Agent deletes a section → it disappears (fade-out if possible), siblings reflow smoothly.
6. Rapid consecutive patches (agent streaming) → no flicker, no scroll jumps, updates batch smoothly.

---

## Phase 6: Polish & Testing

### Goal
The editor is tested end-to-end, edge cases are handled, and there's a working example catalog for others to try.

### What to build

**1. E2E tests with Playwright**
- Test the full interaction loop:
  - Page loads → renders full-screen → no editor chrome visible.
  - Hover → glow appears → move away → glow disappears.
  - Click → floating bar → click outside → deselect.
  - Drag section → reorder → Spec updated.
  - Double-click text → edit → Enter → committed.
  - Cmd+Z → undo → Cmd+Shift+Z → redo.
  - Checkpoint create → restore.
- Test MCP integration (if possible — may need a mock MCP client):
  - Apply patch via MCP → editor updates.
  - Selection visible via MCP.
- Test CSS isolation:
  - Load a catalog with aggressive global CSS → editor overlay unaffected.
- Test responsive behavior:
  - Floating bar stays in viewport at all screen sizes.

**2. Integration tests for MCP tools**
- Use `vitest` to test MCP tool handlers directly (without the full MCP transport).
- Test `editor_apply` with valid and invalid patches.
- Test `editor_catalog` in all query modes.
- Test atomic file writes (write + rename, verify contents).
- Test WebSocket message handling (mock WebSocket).

**3. Example catalog**
- Expand the demo catalog or create a second example catalog that demonstrates:
  - More component types (form elements, media, navigation).
  - Nested component structures (grid → card → heading + text + button).
  - Components with multiple text props (to test inline editing picks the right one).
- Include a sample document that exercises all editor features.

**4. Edge cases to handle**
- Empty document (no elements) → show a helpful empty state, not a blank page.
- Single element document → drag-to-reorder disabled (no siblings).
- Very long pages → scroll performance with overlay positioned elements.
- Elements with `display: none` or zero height → skip during hit-testing.
- Concurrent MCP patches while designer is mid-drag or mid-text-edit → queue patches until interaction completes (don't interrupt active gestures).

### Libraries
- `playwright` — E2E browser tests
- `vitest` — unit and integration tests
- `@testing-library/react` — component tests (if needed)

### Constraints
- Tests must run in CI (headless Chromium via Playwright).
- No mocking of json-render internals — test through the public API.
- E2E tests should complete in under 60 seconds total.

### Verification
1. `bun run test` → all unit/integration tests pass.
2. `bun run test:e2e` → all Playwright tests pass in headless Chromium.
3. Load the example catalog → all editor features work as described in earlier phases.
4. Edge cases (empty doc, single element, concurrent patches) handled gracefully.
