---
paths:
  - "packages/mcp-server/**/*.{ts,tsx}"
  - "packages/spec/**/*.{ts,tsx}"
---
when: [distributed] · tier: high-stakes · check: deterministic
Concurrent workers/handlers communicate only by passing immutable job payloads or published facts — never by reading or writing a shared in-process object, cache, or module-level variable.
WRONG:
```ts
let lastSelectedId = "" // module-level, clobbered by every tab's selection-changed handler
function onSelectionChanged(msg: { elementId: string }) {
  lastSelectedId = msg.elementId
}
```
RIGHT:
```ts
function onSelectionChanged(ws: ServerWebSocket<WsData>, msg: { elementId: string; ancestorIds: string[] }) {
  if (ws.data.page) pool.setSelection(ws.data.page, { elementId: msg.elementId, ancestorIds: msg.ancestorIds })
}
// per-page selection lives in the pool's Map, keyed by page — not a shared variable
```
_Avoid_: `let`/module-level mutable counters, caches, or maps read and written by more than one concurrently-running handler.
Detect: a variable declared outside any single job's function scope that is mutated by handler code running concurrently for different jobs.
Not-when: the "shared" value is a read-only, immutably-replaced config loaded once at startup (composition root) — dependency-at-the-edges already covers that case.
