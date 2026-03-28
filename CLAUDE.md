# json-render-editor

Zero-chrome visual editor for json-render documents. AI agents compose via MCP, designers review and steer.

## Stack

Bun monorepo. TypeScript ESM.
- `packages/editor` — React 19 + Vite
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

When writing `packages/mcp-server/` code:
- Use Effect v3 for concurrency and pipelines.
- Atomic patch application: all succeed or none applied, with rollback.
- Filesystem-first: pages on disk, memory cache for speed.

When touching json-render:
- Use `@json-render/core` types (`Spec`, `UIElement`) directly. Do NOT redeclare them.
- Use `@json-render/core` operations (`applySpecPatch`, `diffToPatches`, `validateSpec`, `autoFixSpec`) directly. Do NOT reimplement them.
- Patches are RFC 6902 (JSON Patch) — use json-render's format. Do NOT invent a custom patch format.

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
```
