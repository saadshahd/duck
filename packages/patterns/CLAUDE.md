# packages/patterns

Pure-function library for matching and applying section patterns to Puck `ComponentData`. No React, no Effect, no side effects. Entry point: `createPatternRegistry`.

## Concepts

**Roles** — every component type maps to a `ComponentSlotType` string via `patternConfig.componentRoles`. `CONTAINER_ROLE` is special: containers are transparent wrappers, not content. Matching and merging collect content by traversing through containers recursively.

**`SectionPattern`** — a named slot structure plus a `data` template. The template holds placeholder instances of each slot type. `merge` replaces those placeholders with real content from `data`.

**`PatternSlot`** — accepts one or more `ComponentSlotType`s and has a `Cardinality`:
- `first` — exactly one (required, singular)
- `optional` — zero or one (optional, singular)
- `many` — one or more (required, plural)
- `any` — zero or more (optional, plural)

**Lossless invariant** — `isApplicable` returns `true` only when every content role present in `data` is accepted by at least one slot. A pattern that would silently drop content is never applicable.

## Authoring a `PatternConfig`

```ts
// duck.config.ts (project convention)
export const patternConfig: PatternConfig = {
  componentRoles: {
    Stack: CONTAINER_ROLE,
    Heading: "heading",
    Body: "body",
    Image: "image",
  },
  patterns: [
    {
      name: "Text + Image",
      description: "Heading, body copy, and an image side-by-side",
      slots: [
        { name: "headline", accepts: ["heading"], cardinality: { kind: "first" } },
        { name: "copy",     accepts: ["body"],    cardinality: { kind: "many" } },
        { name: "media",    accepts: ["image"],   cardinality: { kind: "optional" } },
      ],
      data: /* template ComponentData */,
    },
  ],
};
```

## Error model

`neverthrow` `Result` only. No `try/catch`, no `throw`. `merge` returns `Result<ComponentData, MergeError>`. The only current error is `{ kind: "required-slot-empty"; slotName: string }`.

## Module map

| File | Responsibility |
|------|---------------|
| `types.ts` | All exported types. Edit types here first. |
| `registry.ts` | `createPatternRegistry` — wires match/merge/derive |
| `match.ts` | `isApplicable`, `collectTopLevel` — lossless check |
| `merge.ts` | `merge` — apply pattern to data, replace placeholders |
| `role.ts` | `CONTAINER_ROLE`, `isContainerRole`, `buildRoleIndex` |
| `cardinality.ts` | `isRequired`, `isPlural` |
| `derive.ts` | `deriveVariations` — enumerate enumerable field options from Puck Config |
| `testing.ts` | `make` — minimal `ComponentData` factory for tests |

## Testing

- `bun:test`. Co-locate: `foo.ts` → `foo.test.ts`.
- Pure functions: test every `Cardinality` × slot combination for `isApplicable` and `merge`.
- Verify the lossless invariant: a pattern never applies when it would drop a content role.
- Use `make(type, id, extraProps)` from `testing.ts` for test data.
- No mocks. No fixtures. Real `PatternConfig` objects.

## Do NOT

- Add React, Effect, or any I/O. This package is pure functions.
- Reimplement tree walking — use `slotKeysOf`, `mapComponent` from `@duck/spec`.
- Redeclare `ComponentData` or `Config` — import from `@puckeditor/core`.
- Add a custom `Result` type — use `neverthrow`.
- Make `isApplicable` lossy — the lossless invariant is a correctness guarantee, not a preference.
- Map a component type to multiple roles — `componentRoles` is a flat lookup, one type → one role.
