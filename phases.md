# Implementation Phases

## Phase 4: MCP Server

### Goal

AI agents connect to the editor via MCP. Closed feedback loop: agent edits → designer sees changes → designer gives feedback → agent adjusts.

### Architecture

```
MCP Server (single Bun process)
  ├── stdio → Agent (MCP protocol)
  ├── HTTP+WebSocket → Browser (bridge)
  └── Storage interface → FileStorage / CMS adapter
```

### Tool model

| Tool | Purpose |
|------|---------|
| `editor_status` | Pages, bridge, connections |
| `editor_query` | Unified reads: outline, element, subtree, type, search, selection, capture, catalog |
| `editor_apply` | RFC 6902 patches → draft |
| `editor_commit` | Promote draft, push to browser |
| `editor_discard` | Delete draft |

### Step 1: Storage interface + FileStorage

**Context**: The MCP server needs a storage layer that abstracts file I/O so CMS adapters can be swapped in later. `FileStorage` is the default.

**Build**:
1. Define `Storage` interface in `packages/mcp-server/src/storage.ts`:
   - Types: `PageInfo = { name: string; elementCount: number; hasDraft: boolean }`, `StorageError`, `NotFound`
   - Methods: `listPages`, `readSpec`, `writeSpec`, `readDraft`, `writeDraft`, `commitDraft`, `discardDraft`
   - All methods return `Effect` with typed errors

2. Implement `FileStorage` in `packages/mcp-server/src/file-storage.ts`:
   - Constructor takes `projectDir: string` (the `.json-render-editor/` directory)
   - `listPages`: scan `pages/*/spec.json`, count elements per page, check for `spec.draft.json`
   - `readSpec`: read + parse `pages/{page}/spec.json`. Return `NotFound` if missing.
   - `writeSpec`: atomic write (`.tmp` + rename) to `pages/{page}/spec.json`
   - `readDraft`: read `spec.draft.json` if exists, return `null` if not
   - `writeDraft`: atomic write to `spec.draft.json`
   - `commitDraft`: verify draft exists → atomic rename `spec.draft.json` → `spec.json`. Return `NotFound` if no draft.
   - `discardDraft`: delete `spec.draft.json`. Idempotent (no error if missing).
   - Page name validation: kebab-case regex, max 64 chars

3. Use `@json-render/core` `Spec` type for all spec values. Import, don't redeclare.

**Verify**:
- Unit test in `file-storage.test.ts`:
  - Create a temp directory, instantiate FileStorage
  - Write a spec → read it back → identical
  - Draft lifecycle: write draft → read draft → commit → read spec (sees draft content) → draft gone
  - Discard: write draft → discard → read draft returns null
  - Discard non-existent draft → no error
  - Commit without draft → NotFound error
  - List pages: create 3 pages, one with draft → listPages returns correct info
  - Invalid page name → error
  - Atomic write: verify no partial writes (write large spec, check file after)
- `bun test packages/mcp-server/src/file-storage.test.ts` passes

**Dependencies**: `@json-render/core` (add to mcp-server package.json), `effect` (already installed)

---

### Step 2: MCP server skeleton + bridge

**Context**: The MCP server is a single process with two transports: stdio for MCP protocol, HTTP+WebSocket for browser bridge. The bridge enables the closed agent-designer loop.

**Build**:
1. MCP server entry in `packages/mcp-server/src/index.ts`:
   - Read project directory from `--project-dir` arg or cwd
   - Instantiate `FileStorage`
   - Read `catalog.json` + `catalog-prompt.txt` from project dir (fail with clear message if missing)
   - Start bridge HTTP+WebSocket server on port 0 (OS-assigned)
   - Connect MCP stdio transport
   - Register tools (stubs initially — implement in later steps)

2. Bridge in `packages/mcp-server/src/bridge.ts`:
   - `Bun.serve` with WebSocket upgrade
   - Connection state: `Map<pageName, Set<WebSocket>>` — multiple tabs per page
   - On WebSocket connect: wait for `{ type: "ready", page }` message, add to page's connection set
   - `pushSpecUpdate(page, spec)`: broadcast `{ type: "spec-update", spec }` to all connections for that page
   - `getSelection(page)`: return most recent `{ type: "selection-changed", ... }` for that page, or null
   - `requestCapture(page, options)`: send `{ type: "capture-request", id, ...options }` to one connection for that page, return Promise that resolves on `{ type: "capture-response", id, image }`
   - Capture timeout: 10 seconds
   - On WebSocket close: remove from connection set
   - HTTP routes: `GET /health` → `{ ok: true, port }`, `GET /status` → connections per page

3. Server composition in `packages/mcp-server/src/server.ts`:
   - Type: `McpServerConfig = { storage: Storage; catalogData: CatalogData; bridge: Bridge }`
   - Tool registration helper that adapts Effect handlers to MCP SDK handlers (Effect.runPromise at boundary)
   - Each tool gets the config injected

**Verify**:
- Start the server: `bun run packages/mcp-server/src/index.ts --project-dir .json-render-editor`
  - Bridge HTTP server starts, port printed to stderr
  - `GET /health` returns `{ ok: true }`
  - MCP stdio transport connects (test with `echo '{"jsonrpc":"2.0","method":"initialize",...}' | bun run ...`)
- If `catalog.json` missing: clear error message, not a crash
- Unit test for bridge:
  - Create bridge, connect mock WebSocket, verify ready message registers connection
  - Broadcast spec update → all connections for that page receive it
  - Request capture → timeout when no response
  - Disconnect → connection removed from set

**Dependencies**: `@modelcontextprotocol/sdk` (already installed), `effect` (already installed)

---

### Step 3: `editor_status` tool

**Context**: The first tool agents call. Returns page list, bridge info, and connection status.

**Build**:
1. Tool handler in `packages/mcp-server/src/tools/status.ts`:
   - No input parameters
   - Pipeline: `storage.listPages()` → combine with bridge status
   - Output:
     ```ts
     {
       pages: Array<{ name: string; elementCount: number; hasDraft: boolean }>;
       bridge: { port: number; connectedPages: string[] };
     }
     ```
   - Register with MCP SDK: name `editor_status`, read-only annotation hints

**Verify**:
- Create `.json-render-editor/pages/landing/spec.json` with demo spec
- Start MCP server
- Call `editor_status` via MCP → returns `{ pages: [{ name: "landing", elementCount: ~40, hasDraft: false }], bridge: { port: N, connectedPages: [] } }`
- Create `spec.draft.json` for landing → call again → `hasDraft: true`
- Unit test with mock storage: listPages returns known data → output matches

---

### Step 4: `editor_query` tool — spec modes

**Context**: The unified read tool. This step implements the spec-reading modes: outline, element, subtree, type, search. Bridge-dependent modes (selection, capture) and catalog come in later steps.

**Build**:
1. Tool handler in `packages/mcp-server/src/tools/query.ts`:
   - Input schema (Zod):
     ```ts
     z.object({
       page: z.string().optional(),
       what: z.enum(["outline", "element", "subtree", "type", "search", "selection", "capture", "catalog"]),
       id: z.string().optional(),
       depth: z.number().optional(),
       componentType: z.string().optional(),
       q: z.string().optional(),
       component: z.string().optional(),
       components: z.array(z.string()).optional(),
     })
     ```

2. Mode implementations in `packages/mcp-server/src/tools/query-modes/`:
   - `outline.ts`: Walk spec tree from root, include full props up to `depth` levels, summarize deeper elements as `{ type, childCount }`. Return `{ outline, totalElements, isDraft }`.
   - `element.ts`: Return one element with full props + immediate children outlines. Error with available IDs if not found.
   - `subtree.ts`: Return element + all descendants with full props. Error with available IDs if not found.
   - `type.ts`: Filter `spec.elements` by type, return matches with ancestry path. Return `{ elements, count }`.
   - `search.ts`: Search all string prop values for substring match (case-insensitive). Return matches with ancestry + matching prop key/value. Return `{ results, count }`.

3. Common: all spec modes read draft first (via `storage.readDraft`), fall back to `storage.readSpec`.

**Verify**:
- Load demo sample-document.json into `.json-render-editor/pages/landing/spec.json`
- `editor_query({ page: "landing", what: "outline" })` → tree outline, ~2 levels, deeper nodes summarized
- `editor_query({ page: "landing", what: "outline", depth: 1 })` → only root + direct children
- `editor_query({ page: "landing", what: "element", id: "hero-heading" })` → Heading element with props
- `editor_query({ page: "landing", what: "element", id: "nonexistent" })` → error with available IDs
- `editor_query({ page: "landing", what: "subtree", id: "hero" })` → hero + all descendants
- `editor_query({ page: "landing", what: "type", componentType: "Button" })` → all buttons with ancestry
- `editor_query({ page: "landing", what: "search", q: "Visual Editor" })` → elements containing that text
- Unit tests for each mode with small test specs (3-5 elements)

---

### Step 5: `editor_query` — catalog mode

**Context**: Agents need component schemas to write correct patches. Catalog data is pre-computed JSON read from disk.

**Build**:
1. Catalog mode in `packages/mcp-server/src/tools/query-modes/catalog.ts`:
   - No `page` param needed
   - Sub-modes:
     - `component: "Button"` → return that component's JSON Schema + description
     - `components: ["Button", "Card"]` → batch fetch, report unknown types in errors
     - `q: "layout"` → fuzzy search component names + descriptions
     - Default → summary: all components grouped, name + description + prop count
   - Return system prompt text from `catalog-prompt.txt` in summary mode

2. Catalog data loader in `packages/mcp-server/src/catalog.ts`:
   - Type: `CatalogData = { schema: Record<string, ComponentSchema>; prompt: string }`
   - `loadCatalog(projectDir)`: read + parse `catalog.json`, read `catalog-prompt.txt`
   - Validate structure on load, clear error if malformed

3. Catalog helper export in `packages/mcp-server/src/catalog-helper.ts`:
   - `writeCatalogFiles(catalog, outputDir)`: calls `catalog.jsonSchema({ strict: true })` and `catalog.prompt()`, writes both files
   - Exported from package main entry for consumers

**Verify**:
- Generate catalog files from demo: `writeCatalogFiles(demoCatalog, '.json-render-editor')`
- `editor_query({ what: "catalog" })` → summary of 8 demo components
- `editor_query({ what: "catalog", component: "Button" })` → Button JSON Schema with props
- `editor_query({ what: "catalog", components: ["Button", "Nonexistent"] })` → Button schema + error for Nonexistent
- `editor_query({ what: "catalog", q: "layout" })` → Stack, Grid, Box
- Unit test with small catalog data fixture

---

### Step 6: `editor_apply` tool

**Context**: The write tool. Applies RFC 6902 patches to a draft. Core of the agent editing workflow.

**Build**:
1. Tool handler in `packages/mcp-server/src/tools/apply.ts`:
   - Input: `{ page: string, patches: JsonPatch[] }`
   - Pipeline:
     1. Read draft (or committed spec if no draft)
     2. Deep-clone the spec (`structuredClone` — protect against `applySpecPatch` mutation)
     3. Apply patches sequentially with `applySpecPatch` from `@json-render/core`
     4. On failure at op N: return `{ error, failedOpIndex: N, availableElementIds }`. No draft written.
     5. Run `validateSpec` — collect warnings (advisory, don't block)
     6. Run `autoFixSpec` if fixable issues found
     7. Write result to draft via `storage.writeDraft(page, spec)`
     8. Return `{ touchedElementIds, elementCount, warnings }`

2. Determine touched element IDs: diff old spec elements vs new spec elements.

**Verify**:
- Apply valid patch (replace a prop): draft created, prop changed, touchedElementIds includes that element
- Apply valid patch to existing draft: draft updated, no new copy from committed
- Apply invalid patch (bad path): error with failedOpIndex 0, no draft written
- Apply 5 patches where #3 fails: error with failedOpIndex 2, patches 0-1 NOT applied (full rollback)
- Apply patch that triggers validation warning: warning returned, draft still written
- Page not found: error with available pages
- Unit tests for each scenario

---

### Step 7: `editor_commit` + `editor_discard` tools

**Context**: Draft lifecycle. Commit promotes agent's work to the live spec and pushes to the browser. Discard reverts.

**Build**:
1. `editor_commit` in `packages/mcp-server/src/tools/commit.ts`:
   - Input: `{ page: string }`
   - Pipeline:
     1. `storage.commitDraft(page)` — promotes draft to committed spec
     2. Read the new committed spec
     3. `bridge.pushSpecUpdate(page, spec)` — push to all connected browsers
     4. Return `{ committed: true, elementCount }`
   - Error: no draft exists → `{ error: "No active draft for page '{page}'" }`
   - **History integration**: The browser bridge client pushes incoming spec through `history.push(spec, "Agent commit")`, NOT `setSpec()`. User can Cmd+Z to revert. All prior edits remain in undo stack.

2. `editor_discard` in `packages/mcp-server/src/tools/discard.ts`:
   - Input: `{ page: string }`
   - `storage.discardDraft(page)` — delete draft
   - Return `{ discarded: true }`
   - Idempotent: discarding non-existent draft → success

**Verify**:
- Apply patches → commit → `readSpec` returns patched version → draft gone
- Commit pushes to bridge: connect mock WebSocket, commit, verify `spec-update` received
- Commit without draft → clear error
- Apply → discard → readDraft returns null → readSpec returns original
- Discard non-existent → success
- Unit tests for both tools

---

### Step 8: `editor_query` — selection mode (bridge-dependent)

**Context**: Returns what the designer is currently focused on in the browser. Requires bridge WebSocket connection.

**Build**:
1. Selection tracking in bridge (`bridge.ts`):
   - On `{ type: "selection-changed", page, selection }` from browser:
     - Store: `Map<page, { elementId, elementType, props, ancestry }>`
     - Live while connected, no TTL
   - On WebSocket close: clear selection for that page
   - `getSelection(page)`: return stored selection or null

2. Query mode in `packages/mcp-server/src/tools/query-modes/selection.ts`:
   - When browser connected + selection exists: return `{ elementId, type, props, ancestry, page }`
   - When browser connected + no selection: `{ selection: null, connected: true }`
   - When no browser: `{ selection: null, connected: false, message: "Open the editor to enable selection" }`

3. Browser-side: send selection changes to bridge WebSocket on select/deselect.

**Verify**:
- No browser → `{ connected: false }`
- Browser connected, nothing selected → `{ selection: null, connected: true }`
- Select element → query → returns element details
- Deselect → null. Different element → new element.
- Browser disconnects → selection cleared
- Unit test with mock bridge state

---

### Step 9: `editor_query` — capture mode (bridge-dependent)

**Context**: Captures a screenshot from the browser, saves as a file, returns the path.

**Build**:
1. Capture flow in bridge:
   - `requestCapture(page, opts)`:
     - Send `{ type: "capture-request", id: randomUUID, elementId?, viewport? }` to one connection
     - Wait for `{ type: "capture-response", id, imageBase64 }` (10s timeout)
     - Decode → write to `{projectDir}/captures/{page}-{timestamp}.png`
     - Return file path
   - Cleanup: delete files older than 1 hour

2. Query mode in `packages/mcp-server/src/tools/query-modes/capture.ts`:
   - Output: `{ path: string, viewport: { width, height } }`
   - Error when no browser / timeout

3. Browser-side: on `capture-request`, capture viewport or element, encode as base64 PNG.

**Verify**:
- No browser → clear error
- Browser connected → capture → PNG file exists → valid image
- Capture with elementId → cropped to element
- Timeout → clear error
- Old captures cleaned up

---

### Step 10: Browser bridge client + demo integration

**Context**: The browser needs a client that connects to the MCP server's bridge. This step adds the client and integrates it into the demo app.

**Build**:
1. Bridge client in `packages/mcp-server/src/bridge-client.ts` (exported for consumers):
   - `createBridgeClient(url)`: connect, ready message, spec update callback, capture handler, selection sender
   - Auto-reconnect (exponential backoff, max 5s)

2. Demo app integration (`packages/editor/src/demo/App.tsx`):
   - On mount: create bridge client, connect with page name
   - On `specUpdate`: push through `history.push(newSpec, "Agent commit")` — labeled history entry
   - On `captureRequest`: capture rendered page as base64 PNG
   - Send selection changes to bridge
   - Bridge URL from env var or `.mcp.json` metadata

3. Query param support: `?page=X&draft=true` loads spec from bridge API

**Verify**:
- Start MCP + demo → browser connects (visible in `editor_status`)
- Apply + commit → browser updates live
- Select element → `editor_query({ what: "selection" })` returns it
- `editor_query({ what: "capture" })` → file saved → viewable
- Disconnect → graceful degradation

---

### Step 11: Annotation ("Copy context")

**Context**: Manual fallback for agent context. Complements bridge-based selection.

**Build**:
1. Context builder in `packages/editor/src/editor/selection/copy-context.ts`:
   - `buildElementContext(spec, elementId)`: ancestry path, type, props, parent

2. Add "Copy" action to `FloatingActionBar`:
   - On click: build context → `navigator.clipboard.writeText(text)`
   - Brief "Copied" confirmation

3. Wire through `useActionHandler`.

**Verify**:
- Select element → copy → clipboard has structured context
- Works for root (no parent) and deeply nested elements
- E2E test

---

### Step 12: Catalog init + end-to-end demo

**Context**: Final integration. Full loop works end-to-end.

**Build**:
1. Demo setup script: generate catalog files, create initial page, print instructions
2. Package.json scripts: `mcp:setup`, `mcp`
3. Update `.mcp.json`

**Verify** (full end-to-end):
1. `bun run mcp:setup` → project dir ready
2. `bun run dev` + MCP server starts → bridge connects
3. `editor_status` → pages, browser connected
4. `editor_query({ what: "catalog" })` → 8 components
5. `editor_query({ what: "outline", page: "landing" })` → page structure
6. `editor_apply` → draft created
7. `editor_commit` → browser updates
8. `editor_query({ what: "selection" })` → user's focus
9. `editor_query({ what: "capture" })` → screenshot file
10. "Copy context" → paste → agent sees text

### Constraints

- Effect v3 for MCP server only. No Effect in editor bundle.
- No neverthrow in MCP server — Effect is the one error model.
- The editor library has zero knowledge of MCP, bridge, or storage.
- CMS adapter complexity lives in the adapter, not the Storage interface.
- Page creation/deletion is a CMS concern, not MCP.

---

## Phase 5: Stable Updates

### Goal

When the AI agent applies patches via MCP, the page updates without disturbing the designer. No scroll jumps, no selection loss, no flicker.

### What to build

**1. Stable React keys**

- Ensure the json-render `Renderer` uses element IDs as React keys. Check if `@json-render/react` does this by default. If not, wrap the registry to inject `key={elementId}` on each rendered element.
- This ensures React reconciles elements by identity, not by position — moving an element in the children array doesn't destroy and recreate it.

**2. Scroll position preservation**

- Before applying a Spec update from MCP: record `window.scrollY` (or the scroll container's `scrollTop`).
- After React re-renders with the new Spec: restore the scroll position.
- Use `requestAnimationFrame` or `useLayoutEffect` to restore before the browser paints.
- Edge case: if the element above the viewport was deleted, the viewport may shift. Anchor to the first visible element instead of absolute scroll position.

**3. Selection preservation**

- Before applying a Spec update: record `selectedElementId` from the XState machine.
- After update: if the element still exists in the new Spec, keep it selected and reposition the floating bar. If deleted, deselect.
- The floating bar position may need to update (element may have moved). Recalculate `getBoundingClientRect` after render.

**4. Change highlight animation**

- When a Spec update arrives from MCP, diff the old and new Spec to find which elements changed (added, updated, removed).
- Use `@json-render/core`'s `diffToPatches` if available, otherwise diff the `elements` maps.
- For changed elements: apply a brief glow animation (0.5s, subtle blue pulse) via the Shadow DOM overlay.
- For added elements: brief fade-in animation.
- For removed elements: brief fade-out before removal (if possible with React's reconciliation — may need `AnimatePresence` from `motion`).
- Animations are non-blocking — they don't prevent the designer from interacting.

### Libraries

- `motion` v12 — change highlight animations, `AnimatePresence` for exit animations
- `@json-render/core` — `diffToPatches` for change detection

### Constraints

- No full page re-renders. React's reconciliation + stable keys handles partial updates.
- Scroll preservation must work even when elements above the viewport change size.
- Animation must be subtle — a brief glow, not a jarring flash. Duration: 300-500ms. Color: `rgba(59, 130, 246, 0.15)` background pulse.

### Verification

1. Scroll to middle of page → agent applies patch to hero (above viewport) → scroll position unchanged.
2. Select a card → agent updates the card's text → card stays selected, floating bar repositions correctly.
3. Agent adds a new section → it fades in with subtle animation.
4. Agent updates a heading → the heading glows briefly, then returns to normal.
5. Agent deletes a section → it disappears (fade-out if possible), siblings reflow smoothly.
6. Rapid consecutive patches (agent streaming) → no flicker, no scroll jumps, updates batch smoothly.

---

## Phase 6: Polish & Testing

### Goal

The editor is tested end-to-end, edge cases are handled, and there's a working example catalog for others to try.

### What to build

**1. E2E tests with Playwright**

- Test the full interaction loop:
  - Page loads → renders full-screen → no editor chrome visible.
  - Hover → glow appears → move away → glow disappears.
  - Click → floating bar → click outside → deselect.
  - Drag section → reorder → Spec updated.
  - Double-click text → edit → Enter → committed.
  - Cmd+Z → undo → Cmd+Shift+Z → redo.
  - Checkpoint create → restore.
- Test MCP integration (if possible — may need a mock MCP client):
  - Apply patch via MCP → editor updates.
  - Selection visible via MCP.
- Test CSS isolation:
  - Load a catalog with aggressive global CSS → editor overlay unaffected.
- Test responsive behavior:
  - Floating bar stays in viewport at all screen sizes.

**2. Integration tests for MCP tools**

- Use `vitest` to test MCP tool handlers directly (without the full MCP transport).
- Test `editor_apply` with valid and invalid patches.
- Test `editor_catalog` in all query modes.
- Test atomic file writes (write + rename, verify contents).
- Test WebSocket message handling (mock WebSocket).

**3. Example catalog**

- Expand the demo catalog or create a second example catalog that demonstrates:
  - More component types (form elements, media, navigation).
  - Nested component structures (grid → card → heading + text + button).
  - Components with multiple text props (to test inline editing picks the right one).
- Include a sample document that exercises all editor features.

**4. Edge cases to handle**

- Empty document (no elements) → show a helpful empty state, not a blank page.
- Single element document → drag-to-reorder disabled (no siblings).
- Very long pages → scroll performance with overlay positioned elements.
- Elements with `display: none` or zero height → skip during hit-testing.
- Concurrent MCP patches while designer is mid-drag or mid-text-edit → queue patches until interaction completes (don't interrupt active gestures).

### Libraries

- `playwright` — E2E browser tests
- `vitest` — unit and integration tests
- `@testing-library/react` — component tests (if needed)

### Constraints

- Tests must run in CI (headless Chromium via Playwright).
- No mocking of json-render internals — test through the public API.
- E2E tests should complete in under 60 seconds total.

### Verification

1. `bun run test` → all unit/integration tests pass.
2. `bun run test:e2e` → all Playwright tests pass in headless Chromium.
3. Load the example catalog → all editor features work as described in earlier phases.
4. Edge cases (empty doc, single element, concurrent patches) handled gracefully.
