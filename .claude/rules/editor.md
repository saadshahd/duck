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
- The editor is catalog-agnostic. It works with ANY Puck Config.
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

### Module layers

Three layers, strict downward dependency:

| Layer | Modules | Knows about | Character |
|-------|---------|-------------|-----------|
| **Shell** | `shell.tsx` | All layers | Composition root. Wires domains + infra, passes props down. No logic. |
| **Domain** | `selection/`, `drag/`, `box-model/`, `prop-editor/`, `history/`, `keyboard/` | Infrastructure, spec-ops | Interaction behavior. Each domain owns its hooks, components, CSS, and machines. Domains never import from each other. |
| **Infrastructure** | `fiber/`, `overlay/`, `machine/`, `layout/`, `spec-ops/` | Nothing inside `src/editor/` | Pure modules. No interaction state, no React hooks with side effects. |

**Infrastructure is pure.** It provides types, data structures, and deterministic functions. Infrastructure modules never import from domains or shell. They never hold interaction state (selected ID, drag source, hover target).

**Domains are stateful.** They own interaction hooks (`useDragReorder`, `useMoveInfo`), read from infrastructure, and expose props/callbacks for the shell to wire.

**Shell is glue.** It calls domain hooks, passes results as props to domain components. When two domains need shared data (e.g., both need axis detection), the shared logic lives in infrastructure — not in one domain re-exporting to the other.

### Deciding where code belongs

- **Multiple domains need it → infrastructure.** `layout/axis.ts` exists because both `drag/` and `selection/` need axis detection. If only one domain needed it, it would stay in that domain.
- **Pure function on spec data → `spec-ops/`.** `findParent`, `reorderChild`, `deleteElement`.
- **Pure function on DOM geometry → `layout/`.** `detectAxis`, `resolveParentAxis`.
- **DOM element registry → `fiber/`.** Element lookup by ID.
- **Shadow DOM + CSS injection → `overlay/`.** Rendering surface.
- **State machine definitions → `machine/`.** Editor FSM, event types, context shape.

### Dependency rules

- Shell → domains and infrastructure.
- Domains → infrastructure. Never reverse.
- Domains → domains: **never**. If two domains need to coordinate, shell wires them via props.
- Infrastructure → infrastructure: allowed (e.g., `layout/` imports `fiber/` for registry type).
- Infrastructure → domains or shell: **never**.
- No circular imports.

## Design direction

This editor is a review/feedback surface, not a creation tool.
- The rendered page IS the editor.
- Do NOT add modes, toolbars, or panels.
- AI agents connect via MCP. No AI chat interface in editor.
