# Duck ↔ Puck interop

Duck is a zero-chrome visual editor for Puck `Data` / `Config`. It renders
production output via `<Render>` and layers editing controls on top in a Shadow
DOM overlay. Duck is **not** a drop-in replacement for `<Puck>`; it is a sibling
component that accepts a deliberate subset of Puck's prop surface.

## Accepted

`<Editor>` accepts these props. Each one carries Puck semantics — a value that
works with `<Puck>` works here.

| Prop       | Type                   | Notes                                                                                                |
| ---------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `data`     | `Data`                 | Source of truth for the rendered document. Duck normalizes to `{ root, content, zones }` internally. |
| `config`   | `Config<UserConfig>`   | The component catalog. Same object shape consumed by `<Puck>` / `<Render>`.                          |
| `onChange` | `(data: Data) => void` | Fires after every committed edit (drag, prop edit, paste, undo, …). Mirrors Puck's `onChange`.       |
| `metadata` | `Metadata`             | Forwarded to `<Render>` so components can read project-level metadata.                               |

## Duck-only additions

| Prop            | Type            | Notes                                                                                                                                     |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `patternConfig` | `PatternConfig` | Enables the morph picker. Triggers a dynamic import of `@duckeditor/patterns`. Optional peer dependency.                                  |
| `children`      | `ReactNode`     | Rendered inside the overlay surface. Use with `useEditorInternals()` to layer custom overlay UI (status indicators, presence dots, etc.). |

## Extension hook

`useEditorInternals()` is exported from `@duckeditor/core`. Inside `children`,
it returns:

```ts
{ currentData: Data; lastSelectedId: string | null; push: (data: Data, label: string) => void }
```

The hook is the supported way for wrappers to read the live document, observe
selection, or inject committed snapshots (used by the bridge to relay agent
edits). The shape is a stable extension contract — changes to it are breaking.

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
- **`resolveData` integration** — run on load, insert, edit, and move, so derived fields update in real time.
- **Independently-selectable slots** — today only components are selectable; slots themselves should be too.
- **Field UI parity** — Duck's prop editor is a small subset of Puck's field types.

When wiring these, prefer **adding a Duck-only behavior** over emulating a
specific Puck prop. The point of the interop boundary is that Duck's rules can
diverge where the chrome-free model demands it.
