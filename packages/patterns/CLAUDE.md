# packages/patterns

Pure-function library for matching and applying section patterns to Puck `ComponentData`. No React, no Effect, no side effects. Entry point: `createPatternRegistry`.

## Concepts

**Roles** — every component type maps to a `ComponentSlotType` string via `patternConfig.componentRoles`. Two roles are structural, not content:
- `CONTAINER_ROLE` — a transparent wrapper. Matching and merging traverse through it recursively, harvesting its children as if they sat at the parent level.
- `COLLECTION_ROLE` — an opaque list. Its items are never flattened or harvested as content; the collection itself is the unit. A pattern only accepts a collection if one of its slots explicitly lists `"collection"` in `accepts` — that slot receives the whole collection subtree unchanged, and `merge` preserves every id inside it (not just its own) so `remintIds` never reassigns identity to items the user never touched.

**`SectionPattern`** — a named slot structure plus a `data` template. The template holds placeholder instances of each slot type (including, optionally, a collection placeholder). `merge` replaces those placeholders with real content from `data`.

**`PatternSlot`** — accepts one or more `ComponentSlotType`s and has a `Cardinality`:
- `first` — exactly one (required, singular)
- `optional` — zero or one (optional, singular)
- `many` — one or more (required, plural)
- `any` — zero or more (optional, plural)

**Lossless invariant** — `isApplicable` returns `true` only when every content role present in `data` — including any `COLLECTION_ROLE` instance found by `collectCollections` — is accepted by at least one slot, and singular slots aren't over-counted by instance. A pattern that would silently drop content, or a whole collection, is never applicable. `merge` itself does not re-check this invariant: it is a mechanical apply step, and any role (content or collection) with no accepting slot is silently left out of the result, exactly as an unmatched content role is today. Callers must gate `apply`/`merge` behind `findApplicable`/`isApplicable`.

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

`neverthrow` `Result` only. No `try/catch`, no `throw`. `merge` returns `Result<MergeResult, MergeError>` (`MergeResult` = `{ data, preservedIds }`). The only current error is `{ kind: "required-slot-empty"; slotName: string }` — raised for any required slot (content or collection) with no match, same code path either way.

## Module map

| File | Responsibility |
|------|---------------|
| `types.ts` | All exported types. Edit types here first. |
| `registry.ts` | `createPatternRegistry` — wires match/merge/derive |
| `match.ts` | `isApplicable`, `collectTopLevel`, `collectCollections` — lossless check, incl. collection instances |
| `merge.ts` | `merge` — apply pattern to data, replace placeholders, carry collections wholesale |
| `role.ts` | `CONTAINER_ROLE`, `COLLECTION_ROLE`, `isContainerRole`, `isCollectionRole`, `isContentRole`, `buildRoleIndex` |
| `cardinality.ts` | `isRequired`, `isPlural` |
| `derive.ts` | `deriveVariations` — enumerate enumerable field options from Puck Config |
| `testing.ts` | `make` — minimal `ComponentData` factory for tests |

## Testing

- `bun:test`. Co-locate: `foo.ts` → `foo.test.ts`.
- Pure functions: test every `Cardinality` × slot combination for `isApplicable` and `merge`.
- Verify the lossless invariant: a pattern never applies when it would drop a content role or an unaccepted collection.
- Cover every collection-role branch in `merge`: placed singular, placed plural, first-in-document-order tiebreak, omitted-when-absent (optional), `required-slot-empty` (required), and the silent-drop case when no slot accepts `"collection"`.
- Use `make(type, id, extraProps)` from `testing.ts` for test data.
- No mocks. No fixtures. Real `PatternConfig` objects.

## Do NOT

- Add React, Effect, or any I/O. This package is pure functions.
- Reimplement tree walking — use `slotKeysOf`, `mapComponent` from `@duckeditor/spec`.
- Redeclare `ComponentData` or `Config` — import from `@puckeditor/core`.
- Add a custom `Result` type — use `neverthrow`.
- Make `isApplicable` lossy — the lossless invariant is a correctness guarantee, not a preference.
- Map a component type to multiple roles — `componentRoles` is a flat lookup, one type → one role.
