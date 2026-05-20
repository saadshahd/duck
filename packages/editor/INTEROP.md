# Duck ↔ Puck interop

Duck is a zero-chrome visual editor for Puck `Data` / `Config`. It renders
production output via `<Render>` and layers editing controls on top in a Shadow
DOM overlay. Duck is **not** a drop-in replacement for `<Puck>`; it is a sibling
component that accepts a deliberate subset of Puck's prop surface.

## Setup

Before any `react-dom/client` import in your app, do:

```ts
import "@duckeditor/core/setup";
```

This installs the `bippy` React DevTools hook that powers Duck's selection
layer. It must run before React is evaluated, so it cannot live inside the
`Editor` component — React reads `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` when
its module first evaluates, not at first render.

## Accepted

`<Editor>` accepts these props. Each one carries Puck semantics — a value that
works with `<Puck>` works here.

| Prop       | Type                   | Notes                                                                                                                                                       |
| ---------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`     | `Partial<Data>`        | Source of truth for the rendered document. Duck normalizes `{}` and partial inputs to a full `{ root, content, zones }` document via `spec.normalizeData`. |
| `config`   | `Config<UserConfig>`   | The component catalog. Same object shape consumed by `<Puck>` / `<Render>`.                                                                                 |
| `onChange` | `(data: Data) => void` | Fires after every committed edit (drag, prop edit, paste, undo, …). Mirrors Puck's `onChange`.                                                              |
| `metadata` | `Metadata`             | Forwarded to `<Render>` so components can read project-level metadata. Also threaded into `resolveFields` calls and morph preview rendering.                |

## Duck-only additions

| Prop            | Type            | Notes                                                                                                                                     |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `patternConfig` | `PatternConfig` | Enables the morph picker. Triggers a dynamic import of `@duckeditor/patterns`. Optional peer dependency.                                  |
| `meta`          | `DuckMeta`      | RSC-safe sidecar manifest enriching a vanilla Puck config without changing it. Currently used to mark slots optional. See `.claude/rules/duck-meta.md`. |
| `children`      | `ReactNode`     | Rendered inside the overlay surface. Use with `useEditorInternals()` to layer custom overlay UI (status indicators, presence dots, etc.). |

## Extension hook

`useEditorInternals()` is exported from `@duckeditor/core`. Inside `children`,
it returns:

```ts
{
  currentData: Data;
  lastSelectedId: string | null;
  commit: (commit: DataCommit) => DataPushResult;
}
```

The hook is the supported way for wrappers to read the live document, observe
selection, or inject committed snapshots (used by the bridge to relay agent
edits). Commits must declare resolver intent with `resolve: ResolvePlan`; use
`{ kind: "none" }` only when the committed data must not trigger resolver work.

## `resolveData`

Duck supports component-level `config.components[type].resolveData`. Hosts own
initial and external data resolution: pass Duck already-resolved `data`, and
when the external `data` prop changes Duck resets to that snapshot without
running resolvers or echoing an `onChange`.

Duck re-runs resolvers after Duck-owned mutations:

- inserts resolve the inserted component id
- prop edits resolve the edited component id
- moves and drags resolve the moved component id
- morphs resolve the morphed component id
- bridge `"spec-update"` commits force-resolve every resolver-bearing component
  in the incoming document
- removes clear pending and error resolver state for the removed ids and their
  descendants

Resolver params follow Puck's shape for the resolved component:

- `changed` is top-level prop-key deep equality against the previous input
  passed to the same id's resolver
- `lastData` is that previous input, or `null`
- `metadata` is `{ ...hostMetadata, ...componentConfig.metadata }`; metadata is
  not cloned, so host closures remain reachable
- `trigger` is `"insert"`, `"replace"`, `"force"`, or `"move"` for current Duck
  operations
- `parent` is the actual parent component snapshot, or `null` for top-level
  components

Duck deliberately diverges from Puck here. It does not resolve root data, zones,
or descendant cascades; it resolves exactly the target ids emitted by the editor
operation. It also does not use Puck's skip cache or cancellation model. Instead,
Duck suppresses stale async resolver results with per-id versions and patches
history entries only when the target node still matches the resolver input.

Resolver output is applied as a shallow props merge:

```ts
props = { ...input.props, ...resolved.props }
```

A non-empty `readOnly` object replaces the component's existing `readOnly`.
Missing or empty `readOnly` leaves the existing value unchanged.

Async behavior is visible to hosts through normal history updates. A mutation
can produce one `onChange` for the immediate edit and a second `onChange` when
the resolver finishes, but only if the resolved history entry is still current.
If the user has undone or restored elsewhere, Duck patches that historical entry
silently so returning to it later sees resolved data without sending stale
`onChange` data.

**Breaking change (current cleanup):** the previous shape exposed
`lastSelectedId: string | null` and `selectedSlot: { parentId, slotKey } | null`
as parallel fields. They are replaced by a single `selection: Target | null`.
Multi-select is no longer supported — selection is always a single target.

## Not supported

These Puck props are **not** accepted on `<Editor>`. They fall into two groups.

### Chrome — Duck has no chrome

Duck's design rule: zero persistent chrome. The rendered page IS the editor.
Anything that styles or composes Puck's editor chrome has no surface here.

| Prop                                                               | Reason                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `iframe`                                                           | Duck does not render in an iframe.                                   |
| `renderHeader`, `renderHeaderActions`, `headerTitle`, `headerPath` | Duck has no header.                                                  |
| `viewports`                                                        | Duck has no viewport switcher.                                       |
| `dnd`                                                              | Duck uses pragmatic-drag-and-drop directly, not Puck's DnD pipeline. |
| `height`                                                           | Duck fills its container; height is the host's job.                  |
| `_experimentalFullScreenCanvas`, `_experimentalVirtualization`     | Puck-internal canvas/layout experiments.                             |

### Editor-mode contract — Duck does not emulate

Duck does not emulate `<Puck>`'s editor-mode lifecycle. Components that branch
on `puck.isEditing` will see the production code path inside Duck.

| Prop                                      | Reason                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editMode`                                | Duck has a single mode. There is no preview/edit toggle.                                                                                                            |
| `permissions`                             | Permissions gate Puck chrome (drawer items, action menus) Duck does not render. The selection/insert/delete model is Duck's own and does not consult `permissions`. |
| `onPublish`, `onAction`                   | Duck does not surface a publish or action lifecycle. Use `onChange` to observe edits.                                                                               |
| `ui`                                      | Duck owns its own selection/UI state internally.                                                                                                                    |
| `plugins`, `overrides`, `fieldTransforms` | These extend Puck's editor surface (drawer, fields panel, inline edits). Duck has no equivalent surface to plug into.                                               |
| `initialHistory`                          | Duck has its own history machine. Seeding from a Puck history snapshot is not currently wired.                                                                      |

## Roadmap (P0)

These items are deliberate gaps, tracked for the first stable release:

- **Slot allow/disallow enforcement** — honor `Config.components[].fields[].allow`/`disallow` on insert/move.
- **Independently-selectable slots** — today only components are selectable; slots themselves should be too.
- **Field UI parity** — Duck's prop editor is a small subset of Puck's field types.

## duck.meta extension layer

Duck adds editor-only behavior Puck has no native hook for through a sidecar
JSON manifest (`DuckMeta`) that enriches a vanilla Puck `Config`. The manifest
is RSC-safe (JSON only — no functions, no React components) and additive:
removing it leaves a working vanilla Puck setup. The on-disk Puck JSON is
unchanged.

The first consumer is independently-selectable slots and optional-slot empty
visuals. Future Duck-only behaviors (custom field renderers, predicates) will
extend the same surface via a separate client-only `duck.registry` keyed by
string IDs from the manifest.

See `.claude/rules/duck-meta.md` for the contract.

When wiring these, prefer **adding a Duck-only behavior** over emulating a
specific Puck prop. The point of the interop boundary is that Duck's rules can
diverge where the chrome-free model demands it.
