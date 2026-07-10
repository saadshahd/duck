---
paths: "**/*.test.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Each test names and proves exactly one behavior; multiple unrelated `expect` blocks in one `it` means it's actually several tests wearing a trenchcoat.
WRONG:
```ts
it('validates add', () => {
  expect(add(sample(), { site: { at: 'slot', parentId: 'ghost', path: ['content'] }, component: text('t1') }, config).isErr()).toBe(true)
  expect(add(sample(), { site: { at: 'root' }, component: text('t2'), index: 99 }, config).isErr()).toBe(true)
  expect(add(sample(), { site: { at: 'root' }, component: text('t3') }, config).isOk()).toBe(true)
})
```
RIGHT:
```ts
it('rejects an add under a missing parent', () => {
  const result = add(sample(), { site: { at: 'slot', parentId: 'ghost', path: ['content'] }, component: text('t1') }, config)
  expect(result._unsafeUnwrapErr()).toEqual({ tag: 'parent-not-found', parentId: 'ghost' })
})
it('rejects an add at an out-of-bounds index', () => {
  const result = add(sample(), { site: { at: 'root' }, component: text('t2'), index: 99 }, config)
  expect(result._unsafeUnwrapErr().tag).toBe('index-out-of-bounds')
})
```
_Avoid_: a test name that's a noun phrase ("order validation") instead of a claim; 3+ `expect`s covering different inputs in one `it`.
Detect: an `it`/`test` block whose assertions reference more than one distinct input fixture, or whose title uses "and"/commas to join unrelated claims.
Not-when: multiple assertions all check facets of ONE outcome from ONE input (e.g. `expect(result.status).toBe('ok'); expect(result.total).toBe(500)` on the same call) — that's one behavior, several assertions.
Cross-ref: near-identical-examples-signal-an-unextracted-property — before splitting into more `it` blocks, ask: do the cases differ in code PATH (branch taken / error type) or only in LITERALS? Path → keep them as named examples; literals → collapse to one extracted property instead of many tests.
