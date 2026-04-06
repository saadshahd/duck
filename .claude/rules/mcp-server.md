---
description: Rules for the MCP server package
globs: packages/mcp-server/**
---

## Architecture

Single Bun process, two transports:
1. **stdio** — MCP protocol for agent tool calls
2. **HTTP+WebSocket** — Bridge for browser (live sync, selection, capture)

Three layers:
1. MCP transport → tool calls
2. Tool handlers (Effect pipelines) → business logic
3. Storage (interface + adapters) → spec I/O and drafts

The bridge is first-class. It enables the closed loop: agent edits → user sees → user reacts → agent adjusts.

## Storage interface

All spec I/O goes through `Storage`. Tools NEVER access files directly.

```ts
interface Storage {
  listPages(): Effect<PageInfo[], StorageError>
  readSpec(page: string): Effect<Spec, NotFound | StorageError>
  writeSpec(page: string, spec: Spec): Effect<void, StorageError>
  readDraft(page: string): Effect<Spec | null, StorageError>
  writeDraft(page: string, spec: Spec): Effect<void, StorageError>
  commitDraft(page: string): Effect<void, NotFound | StorageError>
  discardDraft(page: string): Effect<void, StorageError>
}
```

- `FileStorage` is the default. CMS adapters implement the same interface.
- MCP server only sees `Spec`. CMS concerns (refs, i18n, metadata) live in the adapter.

## Effect v3

- Effect for the full pipeline: read → validate → transform → write → respond.
- Typed errors: `NotFound`, `StorageError`, `PatchError`.
- `Effect.runPromise()` at the MCP handler boundary.
- No neverthrow — Effect is the one error model in this package.
- No try/catch.

## Tool model

Six tools:

| Tool | Verb | Purpose |
|------|------|---------|
| `editor_status` | orient | Pages, bridge status, connection info |
| `editor_query` | read | Page-bound reads: outline, element, selection, capture, search |
| `editor_manifest` | read | Catalog reads: component list, single component schema, prompt |
| `editor_apply` | write | RFC 6902 patches → draft |
| `editor_commit` | write | Promote draft → committed spec, push to browser via bridge |
| `editor_discard` | write | Delete draft |

`editor_query` is the unified page read tool. Mode determined by `what` parameter:
- `outline` — depth-limited tree (default depth: 2)
- `element` — single element with full props + children
- `subtree` — element + all descendants
- `type` — all elements of a component type with ancestry
- `search` — text search across prop values
- `selection` — what the user is focused on (bridge-dependent)
- `capture` — screenshot saved as file (bridge-dependent)

`editor_manifest` queries the component catalog. Mode determined by `what` parameter:
- `components` — list all component names with descriptions and slot info
- `component` — single component's full props schema (JSON Schema via Zod)
- `prompt` — full LLM system prompt for the catalog

## Draft model

- First `editor_apply` forks committed → draft.
- One draft per page. Second agent → error.
- `editor_commit` promotes + pushes to browser. Browser receives as a labeled history entry ("Agent commit") — user can Cmd+Z to revert.
- `editor_discard` deletes. Idempotent.
- Orphaned drafts reported by `editor_status`.

## Patch application

- Deep-clone spec before applying. `applySpecPatch` may mutate.
- Apply sequentially. Failure at op N → return original, report `failedOpIndex`.
- Post-apply: `validateSpec` (advisory), `autoFixSpec` if fixable.
- Never return full spec in `editor_apply` response.

## Bridge

- Starts with MCP server. OS-assigned port.
- Connections scoped by page: `{ type: "ready", page: "landing" }`.
- Multiple tabs on same page: broadcast on commit, latest selection wins.
- Multiple MCP servers: separate bridge ports, separate browser tabs.
- Protocol:
  - Server → browser: `spec-update`, `capture-request`
  - Browser → server: `ready`, `selection-changed`, `capture-response`
- Bridge-dependent queries degrade gracefully: "No browser connected."

## Catalog

- Project dir has `catalog.ts` exporting `{ catalog }` (a `@json-render/core` `Catalog` instance).
- MCP server dynamically imports it at startup. Per-conversation server = fresh each session.
- No `catalog.json`, no `catalog-prompt.txt`, no generation step.
- `editor_manifest` exposes catalog data progressively — agent queries what it needs.
- On missing `catalog.ts`: typed `CatalogLoadError` with path and convention hint.

## Page lifecycle

- MCP server does NOT create/delete pages. CMS concern.
- Storage operates on existing pages.
- `FileStorage` discovers via `pages/*/spec.json`.
