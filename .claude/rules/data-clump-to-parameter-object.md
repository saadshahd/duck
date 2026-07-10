---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
The same group of primitives recurring together across 2+ signatures is a data clump — usually an unnamed domain concept, not just an ergonomics complaint. The trigger is not the parameter count on any one signature; it is the recurrence of the group across signatures.
WRONG:
```ts
function insertAt(data: Data, parentId: string, slotPath: (string | number)[], index: number) {}
function moveTo(data: Data, parentId: string, slotPath: (string | number)[], index: number) {}
```
RIGHT:
```ts
type ParentSite = { parentId: string; slotPath: SlotPath; index: number };
function insertAt(data: Data, site: ParentSite) {}
function moveTo(data: Data, site: ParentSite) {}
```
_Avoid_: the same 2+ primitive parameters appearing in the same relative order across unrelated function signatures.
Detect: grep function signatures for repeated parameter-type sequences (e.g., `string, (string|number)[], number` in the same positions) across more than one file — if the clump survives a rename of one call site's variable names, it's structural, not coincidental.
Not-when: a single function has 3+ params that don't recur elsewhere — that is the single-signature grouping handled by object-parameter-at-three-params, not a recurring data clump.
Cross-ref: object-parameter-at-three-params — the single-signature grouping rule this extends across signatures.
