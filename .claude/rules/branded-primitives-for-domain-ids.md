---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: deterministic
A domain identifier or measured quantity that participates in more than one entity's shape must be a branded nominal type, never a bare `string`/`number`.
WRONG:
```ts
type Op = { op: 'move'; id: string; toParentId: string; toIndex: number };
function move(id: string, toParentId: string) { /* ... */ }
// move(toParentId, id) compiles — silently swapped
```
RIGHT:
```ts
type Brand<T, B extends string> = T & { readonly __brand: B };
type ElementId = Brand<string, 'ElementId'>;
type ParentId = Brand<string, 'ParentId'>;
type Op = { op: 'move'; id: ElementId; toParentId: ParentId; toIndex: number };
function move(id: ElementId, toParentId: ParentId) { /* ... */ }
```
_Avoid_: function signatures with 2+ adjacent parameters typed as plain `string` or `number` that represent different domain identities.
Detect: two or more identifiers of the same primitive type appearing as sibling fields or sibling parameters, where swapping their positions would still type-check.
Not-when: a value that's a bare primitive everywhere it's used and never adjacent to a same-typed sibling — e.g. a single free-text `notes: string` field. Don't brand primitives that never risk positional confusion; that's ceremony without a payoff.
