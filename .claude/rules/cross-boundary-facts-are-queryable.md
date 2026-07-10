---
paths:
  - "packages/mcp-server/**/*.{ts,tsx}"
  - "packages/spec/**/*.{ts,tsx}"
---
when: [distributed] · tier: standard · check: judgeable
When state spans processes, services, or third parties, make it observable at runtime — tracing, or structured logs at the boundary — so it can be re-derived on demand. Never depend on holding distributed state in your head, or in a static note that goes stale the moment the system moves.
WRONG:
```ts
// "a browser tab is always connected by the time we capture" — a fact held in your head,
// unobservable when it turns out false and the capture promise hangs
await bridge.capture(page, { mode: "viewport" });
```
RIGHT:
```ts
log.info("bridge.capture.request", { page, mode: mode.mode, viewers: pool.viewers()[page] ?? 0 });
const result = await bridge.capture(page, mode);
log.info("bridge.capture.result", { page, mode: mode.mode, bytes: result.image.length });
```
_Avoid_: reasoning about a cross-service outcome from memory or a comment; a boundary crossing with no trace/log carrying a correlation id and the observed result.
Detect: a call into another process/service/third party whose request and response leave no structured record — nothing lets you re-derive what actually happened at that boundary later.
Not-when: repo-local, in-process work where the state never leaves the boundary and is fully reconstructable from the code path.
