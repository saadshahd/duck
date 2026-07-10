---
paths:
  - "packages/mcp-server/**/*.{ts,tsx}"
  - "packages/spec/**/*.{ts,tsx}"
---
when: [distributed] · tier: standard · check: judgeable
Data on the wire or at rest is read by code older and newer than the code that wrote it — schema changes MUST be additive and tolerant: never remove or repurpose a field, never make a new field required, ignore unknown fields on read.
WRONG:
```ts
type SelectionChanged = { type: "selection-changed"; elementId: string; ancestorIds: string[] } // now required
const path = msg.ancestorIds.map((id) => id)   // old browser tabs omit it -> crash
```
RIGHT:
```ts
type SelectionChanged = { type: "selection-changed"; elementId: string; ancestorIds?: string[] }
const path = msg.ancestorIds ?? []             // tolerant reader; old & new tabs coexist
```
_Avoid_: removing/renaming a serialized field, a newly-required field on an existing message, strict readers that reject unknown keys
Detect: a change to a persisted or transmitted record's shape that drops a field, tightens optional→required, or reads a field without tolerating its absence from an older producer
Not-when: the encoding is internal to one synchronous call and never persisted or sent across a version boundary
