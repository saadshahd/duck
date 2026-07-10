---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Transform data with chained methods (`filter`, `map`, `reduce`) or a `pipe()` composition. Never build up an array with an imperative loop and `push` — the loop hides the shape of the transformation behind mutation and index bookkeeping.
WRONG:
```ts
const ids = [];
for (const child of getChildrenAt(component, slotPath)) {
  if (child.type !== 'Text') ids.push(child.props.id);
}
```
RIGHT:
```ts
const ids = getChildrenAt(component, slotPath)
  .filter((child) => child.type !== 'Text')
  .map((child) => child.props.id);
```
_Avoid_: a `let result = []` (or `const` array) followed by a loop whose body's only job is to `push` derived values into it.
Detect: an array declared empty then populated inside a `for`/`while` loop with `.push` — the pattern reads as accumulation where a `filter`/`map`/`reduce` chain expresses the same result as one dataflow.
Not-when: the loop performs genuine side effects (IO, logging, early `break` on an external condition) rather than building a return value, or the accumulation is a true fold whose per-step cost makes a `reduce` less readable than the loop.
