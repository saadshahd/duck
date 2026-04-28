# Duck

Zero-chrome visual editor for Puck documents. AI agents compose via MCP, designers review and steer. Duck = Puck's `<Render>` + shadow-DOM overlay — no iframe, no chrome.

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

When touching Puck data:
- Use `@puckeditor/core` types (`Data`, `Config`, `ComponentData`) directly. Do NOT redeclare them.
- Use tree-traversal helpers from `@json-render-editor/spec` (`findById`, `findParent`, `buildIndex`, `slotKeysOf`, `preOrder`, etc.). Do NOT reimplement tree walking.
- Ops are four verbs: `add`, `update`, `remove`, `move`. Do NOT use RFC 6902 JSON Patch.
- `update` semantics: `{ ...defaults, ...newProps, id: original.id }` — replace, not merge. Slot fields are overwritable; history is the undo safety net.

## Architecture boundary

The editor library and MCP server are independent packages. The editor takes `data` as a prop and calls `onDataChange`. The MCP server reads/writes data through a Storage interface. Neither imports from the other.

The MCP server includes a bridge (HTTP+WebSocket) that connects to the browser for the closed agent-designer loop. The bridge is first-class, not optional.

| Package | Knows about | Does NOT know about |
|---------|------------|-------------------|
| `editor` | Data, Config (@puckeditor/core) | MCP, filesystem, storage, bridge |
| `mcp-server` | Data, Config, Storage interface, bridge protocol | React, DOM, editor internals |

## Testing

Frameworks: `bun:test` for unit tests, Playwright for E2E.

When writing unit tests:
- Co-locate with source: `foo.ts` → `foo.test.ts` in the same directory.
- Test pure state transitions exhaustively: every state × every input.
- Verify reference identity (`toBe`) when the function should return the same object.
- Build test data with tiny factory functions, not fixtures or mocks.
- Import from `bun:test`. Do NOT use vitest, jest, or any other runner.

When writing E2E tests:
- Co-locate with source: place `*.e2e.ts` in the domain folder that owns the behavior being tested.
- Query overlay elements by `data-role` attribute or ARIA `role`, never by CSS class or DOM structure.
- Import shared overlay helpers from `overlay/testing.ts`.
- Test user-visible behavior, not internal state.

When deciding what to test:
- Pure functions with branching logic → unit test (exhaustive state × input).
- User interactions through the rendered editor → E2E.
- Do NOT mock: no jest.mock, no vi.mock. Tests use real objects or simple test data builders.
- Exception: Storage is the one mockable boundary in MCP server tests.

## Dev

```
bun install
bun run dev        # Vite on :5173
bun run typecheck  # All packages
bun test           # Unit tests (bun:test)
bunx playwright test --project=chromium  # E2E
```
