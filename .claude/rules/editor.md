---
description: Rules for the editor React library package
globs: packages/editor/**
---

## Error handling

Use `neverthrow` for Result types in spec-ops and any fallible editor logic. Do NOT declare custom Result/Either types.

## UI rules

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

## State machines (XState v5)

- Editor overlay lives in Shadow DOM (open mode, via react-shadow).
- React synthetic `mouseenter`/`mouseleave` are unreliable inside shadow DOM. Use `mouseover`/`mouseout` with `relatedTarget` containment checks.
- Immutable document snapshots. Every edit produces a new snapshot.
- No Effect in the browser bundle.

When composing XState machines:
- Each domain owns its machines via `useActorRef`, not composed into root.
- Root machine only holds cross-domain context (pointer + drag share `selectedId`/`dragSourceId`).
- Domain-internal state belongs in domain machines, not root.
- Use `fromTransition` for pure reducers. Use `setup().createMachine()` for delayed transitions or services.
- Shell passes props from domain hooks to components. No `useEffect` bridges.

## Overlay CSS

- Each domain owns its CSS in a colocated `.css` file.
- Shared tokens in `overlay/tokens.css` only.
- Domain components self-register CSS via `useShadowSheet(css)`.
- Repeat properties across domains rather than coupling them.
- CSS custom properties from `:host` for colors, shadows, fonts.

## Keyboard input

- Element-level: `onKeyDown`. Global shortcuts: `tinykeys` through XState machine.
- Key bindings are state-dependent, not global.
- Do NOT use heavyweight keyboard libraries.
- Global shortcuts register once in shell via `tinykeys`.

## Folder structure

`src/editor/` — each subdirectory is one interaction domain or infrastructure concern.
`src/demo/` — demo catalog, registry, sample data. Editor has zero imports from demo.
`shell.tsx` — editor composition root at `src/editor/` root.

Dependency boundaries — one direction:
- `shell.tsx` → domains and infrastructure.
- Domains → infrastructure. Never reverse.
- Domains → `spec-ops/`. Never reverse.
- `machine/` and `fiber/` → nothing inside `src/editor/`.
- No circular imports.

## Design direction

This editor is a review/feedback surface, not a creation tool.
- The rendered page IS the editor.
- Do NOT add modes, toolbars, or panels.
- AI agents connect via MCP. No AI chat interface in editor.
