# json-render-editor

Zero-chrome visual editor for json-render documents. AI agents compose via MCP, designers review and steer.

## Stack

Bun monorepo. TypeScript ESM. Each package owns its own test environment (`bunfig.toml`, preloads, dev deps).
- `packages/editor` — React 19 + Vite. Uses `happy-dom` via `bunfig.toml` preload for DOM globals in unit tests.
- `packages/mcp-server` — Bun + Effect v3

## Response format

Every response MUST start with:

**Approach:** [what and why, one sentence]
**Risks:** [2-3 failure modes]

Then provide code. Exception: trivial tasks (typo, yes/no) skip risks.

## Decision rules

When uncertain between approaches:
- Write three sections: 1. What I know 2. What I assume 3. What I need
- Do NOT pick an approach and backfill justification. Surface the tradeoff.

When adding a dependency or utility:
- Search npm and existing workspace code BEFORE writing custom. Name the package.
- Do NOT reinvent: drag-and-drop, floating UI, state machines, MCP protocol, animation, Shadow DOM.
- Use `neverthrow` for Result types. Do NOT declare custom Result/Either types.

When adding any editor UI element:
- It MUST be contextual: appear on interaction, disappear when done.
- Do NOT add sidebars, toolbars, panels, or any persistent chrome. Zero means zero.

When updating the rendered preview:
- Preserve scroll position and selection.
- Use element IDs as React keys.
- Do NOT cause full page re-renders.
- Do NOT break the designer's flow.

When writing editor logic:
- Never reference specific component types (Heading, Button, Card).
- The editor is catalog-agnostic. It works with ANY json-render catalog.
- Test with the demo catalog only.

## Architecture rules

When writing `packages/editor/` code:
- Use XState v5 for interaction modes.
- Editor overlay lives in Shadow DOM (open mode, via react-shadow).
- Immutable document snapshots. Every edit produces a new snapshot.
- No Effect in the browser bundle.

When handling keyboard input:
- Two levels: element-level (Enter/Escape in inputs) uses `onKeyDown`. Global editor shortcuts (Ctrl+Z, arrows, Escape to deselect) use `tinykeys` dispatching through the XState machine.
- The machine's current state determines which keys are active — key bindings are state-dependent, not global.
- Do NOT use `react-hotkeys-hook`, `hotkeys-js`, or other heavyweight keyboard libraries.
- Do NOT scatter keyboard handlers across components. Global shortcuts register once in the shell via `tinykeys`.

When writing `packages/mcp-server/` code:
- Use Effect v3 for concurrency and pipelines.
- Atomic patch application: all succeed or none applied, with rollback.
- Filesystem-first: pages on disk, memory cache for speed.

When touching json-render:
- Use `@json-render/core` types (`Spec`, `UIElement`) directly. Do NOT redeclare them.
- Use `@json-render/core` operations (`applySpecPatch`, `diffToPatches`, `validateSpec`, `autoFixSpec`) directly. Do NOT reimplement them.
- Patches are RFC 6902 (JSON Patch) — use json-render's format. Do NOT invent a custom patch format.

## Folder structure

When organizing `packages/editor/src/`:
- `src/editor/` contains the editor core. Each subdirectory is one interaction domain or infrastructure concern.
- An interaction domain owns its XState machine slice, UI components, hooks, styles, and tests. Adding a new interaction = adding a new folder.
- Infrastructure concerns (fiber bridging, overlay host, Shadow DOM) that serve multiple domains get their own folder at the same level as interaction domains.
- Every domain folder has an `index.ts` barrel export. External consumers import from the folder, never from internal files.
- `src/demo/` contains the demo catalog, registry, sample data, and app entry. The editor has zero imports from demo. Demo is replaceable.
- `main.tsx` and `vite-env.d.ts` live at `src/` root.
- `shell.tsx` (the editor composition root) lives at `src/editor/` root, not inside a domain folder.

When adding a new feature or interaction mode:
- Create a new folder under `src/editor/` named after the interaction (e.g., `drag/`, `inline-edit/`).
- The folder MUST contain: an `index.ts` barrel, the XState machine slice (if stateful), UI components, and colocated tests (`*.test.ts` for unit, `*.e2e.ts` for Playwright).
- Do NOT scatter a feature's files across multiple existing folders.

When deciding where a file belongs:
- If it serves one interaction domain → that domain's folder.
- If it serves multiple domains → its own infrastructure folder.
- If it's demo/example code → `src/demo/`.
- If unsure → it probably belongs in the domain that triggers it.

Dependency boundaries in `src/editor/` — imports flow in one direction only:
- `shell.tsx` → domain folders (`selection/`, `drag/`, `prop-editor/`) and infrastructure (`fiber/`, `overlay/`, `machine/`).
- Domain folders → infrastructure folders. Never infrastructure → domain.
- Domain folders → `spec-ops/` for pure spec mutations. Never the reverse.
- `machine/` → nothing inside `src/editor/`. It defines types and the state machine only; it does NOT import from domain folders, fiber, or overlay.
- `fiber/` → nothing inside `src/editor/`. It bridges React internals to DOM; it does NOT import from domain folders or machine.
- No circular imports. If folder A imports from folder B, folder B MUST NOT import from folder A, directly or transitively.

## Design direction

This editor is a review/feedback surface, not a creation tool.

When designing any interaction:
- The rendered page IS the editor.
- Hover = boundary glow. Click = floating action bar. Double-click text = inline edit. Drag = reorder siblings.
- Do NOT add modes, toolbars, or panels that require the designer to leave the page view.

When designing AI integration:
- AI agents connect externally via MCP.
- The editor has NO AI chat interface.
- Do NOT add prompt inputs, chat panels, or annotation systems inside the editor.

## Dev

```
bun install
bun run dev        # Vite on :5173
bun run typecheck  # All packages
bun test           # Unit tests (bun:test)
bunx playwright test --project=chromium  # E2E
```

## Testing

Frameworks: `bun:test` for unit tests, Playwright for E2E.

When writing unit tests:
- Co-locate with source: `foo.ts` → `foo.test.ts` in the same directory.
- Test pure state transitions exhaustively: every state × every input.
- Verify reference identity (`toBe`) when the function should return the same object.
- Build test data with tiny factory functions (`hit(id)`, `hovering(id)`), not fixtures or mocks.
- Import from `bun:test`. Do NOT use vitest, jest, or any other runner.

When writing E2E tests:
- Co-locate with source: place `*.e2e.ts` in the domain folder that owns the behavior being tested.
- Query overlay elements by `data-role` attribute or ARIA `role`, never by CSS class, inline style, or DOM structure. The test contract is the role, not the implementation.
- Import shared overlay helpers from `overlay/testing.ts` — don't inline shadow DOM queries in each test file.
- Use `page.waitForTimeout()` for animation/transition settling — the overlay is async.
- Test user-visible behavior (hover glow appears, action bar has N buttons), not internal state.

When deciding what to test:
- Pure functions with branching logic → unit test (exhaustive state × input).
- User interactions through the rendered editor → E2E.
- Do NOT mock: no jest.mock, no vi.mock, no stub services. Tests use real objects or simple test data builders.
- Do NOT test React component rendering in isolation (no render/screen from testing-library). The editor's UI is tested through Playwright against the real page.
