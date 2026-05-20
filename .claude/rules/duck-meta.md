# duck.meta

`duck.meta` is a sidecar JSON manifest that enriches a vanilla Puck `Config`
with editor-only concerns Puck has no native hook for. It is the RSC-safe
extension surface Duck reaches for when a Puck-native hook (`resolveData`,
`metadata`, `Config.fields`) cannot express what Duck needs.

## Identity

- A plain JSON object keyed by component name, mirroring Puck's `Config.components`.
- Enriches a Puck config; never alters it.
- Removing `duck.meta` leaves a fully-functional vanilla Puck catalog. The same
  on-disk JSON renders identically in `@puckeditor/core`'s `<Render>` (an empty
  optional slot will fall back to vanilla Puck's empty-region behavior — that's
  the accepted baseline).
- Keys are component names (strings), values describe Duck-only behavior for
  that component.

## Two-layer model

| Layer | Where | Contents |
|-------|-------|----------|
| `duck.meta` | `packages/spec/` (RSC-safe) | JSON only. Strings, numbers, booleans, arrays, plain objects. |
| `duck.registry` | client-only (`packages/editor/src/`) | React components, predicates, functions, anything keyed by string IDs from the manifest. **Not yet shipped.** |

The slot work uses only the manifest. `duck.registry` is the future seam for
client-only React/JS values; no module exists yet.

## Schema (this iteration)

```ts
type DuckMeta = Partial<Record<string, ComponentMeta>>;

type ComponentMeta = {
  slots?: Partial<Record<string, SlotMeta>>;
};

type SlotMeta = {
  optional?: boolean;
};
```

Helpers in `@duckeditor/spec`:

- `getSlotMeta(meta, type, slotKey)` → `SlotMeta | undefined`
- `isSlotOptional(meta, type, slotKey)` → `boolean`

## What it owns

- Marking slots optional (`slots[key].optional`).
- Future: predicates, custom field renderer IDs, slot validators (via
  `duck.registry` lookup).

## What it does NOT own

- The on-disk Puck JSON shape (`Data`, `ComponentData`).
- Puck render output. The strip pass / placeholder injection happens at the
  Duck render boundary, not in the manifest.
- MCP `editor_apply` op verbs. Slot addressing remains `(parentId, slotKey, index)`.
- `@puckeditor/core` types — never redeclared.
- Functions, React components, or any non-JSON value (RSC violation).

## Usage

```ts
// In your catalog module:
import type { Config } from "@puckeditor/core";
import type { DuckMeta } from "@duckeditor/spec";

export const config: Config = { components: { Hero: { /* ... */ } } };

export const duckMeta: DuckMeta = {
  Hero: {
    slots: {
      footer: { optional: true },
    },
  },
};

// In your app:
<Editor data={data} config={config} meta={duckMeta} />
```

Vanilla Puck consumers ignore the meta export and import `config` only.

## Rendering with optional slots

When `meta[type].slots[key].optional === true` and the slot value is `[]`, the
editor's render path injects a synthetic placeholder child into the slot so
the empty region has a selectable, visible target. The injection is editor-only
and does not affect the on-disk JSON. Production consumers using vanilla Puck
`<Render>` see the empty region as Puck's default.

## Boundary rules

- `DuckMeta` and its helpers live in `packages/spec/` (the `spec-pkg` zone).
- `duck.registry` (when it lands) lives in `packages/editor/src/` (client only).
- The manifest crosses the server→client boundary safely; the registry never does.
