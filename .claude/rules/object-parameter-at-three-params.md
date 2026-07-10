---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: deterministic
A function with 3+ parameters takes a single object parameter. Group related primitives into named domain concepts rather than a positional list the caller must remember the order of.
WRONG:
```ts
function insertChild(parentId: string, slotPath: (string | number)[], index: number, component: ComponentData) {}
insertChild('root-1', ['content'], 0, heading); // which arg was the index?
```
RIGHT:
```ts
function insertChild(op: { parentId: string; slotPath: (string | number)[]; index: number; component: ComponentData }) {}
insertChild({ parentId: 'root-1', slotPath: ['content'], index: 0, component: heading });
```
_Avoid_: any function declaration with 3 or more positional parameters; a call site passing a run of bare literals whose meaning depends on position.
Detect: grep function signatures for 3+ comma-separated parameters; each hit is a candidate.
Not-when: the parameters are already one cohesive tuple with a conventional order (e.g. `(x, y, z)` coordinates), or a framework contract fixes the positional signature.
Cross-ref: data-clump-to-parameter-object — the cross-signature version: the same primitives recurring across 2+ signatures name a missing domain concept.
