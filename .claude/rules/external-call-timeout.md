---
paths:
  - "packages/mcp-server/**/*.{ts,tsx}"
  - "packages/spec/**/*.{ts,tsx}"
---
when: [distributed] · tier: high-stakes · check: deterministic
Every call across a process boundary (HTTP, DB, queue, cache, RPC) carries an explicit timeout at the call site — never the transport default, never absent.
WRONG:
```ts
const health = await fetch(`http://127.0.0.1:${port}/health`)
const image = await captureResponse   // waits forever if the tab never answers
```
RIGHT:
```ts
const health = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) })
const { promise } = caps.request()    // caps registers a setTimeout(10_000) deadline per capture
```
_Avoid_: bare `fetch(`, `.query(`, `.send(`, `axios.get(` with no timeout/signal argument; client constructed once at module scope with no per-call or client-level timeout config.
Detect: an outbound network or DB call whose call site (or its client construction) carries no timeout/deadline parameter.
Not-when: same-process function calls; in-memory operations; a call already wrapped by a library-level default timeout that is itself explicit and short (verify the default, don't assume it).
