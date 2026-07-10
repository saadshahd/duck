---
paths:
  - "packages/mcp-server/**/*.{ts,tsx}"
  - "packages/spec/**/*.{ts,tsx}"
---
when: [distributed] · tier: standard · check: judgeable
A command handler is a pure `decide` function — `(state, command) -> Result<Fact[], E>` — that never persists, logs, or mutates in place. A separate edge function applies the emitted facts and does the IO.
WRONG:
```ts
function applyOp(data: Data, op: Op) {
  data.content.push(op.component)   // mutate in place ...
  storage.writeData(page, data)     // ... and persist ...
  bridge.broadcast(page, data)      // ... and broadcast, all in one body
}
```
RIGHT:
```ts
function decide(data: Data, op: Op): Result<Data, OpError> { ... }   // pure: next Data or a typed error
// edge: const next = decide(data, op); if (next.ok) { storage.writeData(page, next.value); bridge.broadcast(page, next.value) }
```
_Avoid_: a command handler that persists, logs, or mutates state in the same body that computes the domain decision.
Detect: a command-handling function whose body both computes the domain change and calls persistence/IO/logging.
Not-when: state is locally authoritative with nothing to reconcile elsewhere and no audit-trail need — then plain in-place mutation behind side-effects-visible-at-the-call-site is enough; don't impose fact-emission machinery without that trigger.
Cross-ref: mood-names-commands-facts, dependency-at-the-edges — the command/fact naming and edge-isolation rules this specializes for aggregates.
