---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Before restructuring code that has no tests exercising its current behavior, write a characterization test that pins what it actually does now — not what it should do — then refactor under that test's protection.
WRONG:
```ts
// normalizeData() has 0 tests, is untouched, and gets rewritten directly
function normalizeData(data: Data): Data {
  // rewritten to "fix" how empty slot keys get pruned
}
```
RIGHT:
```ts
// 1. Pin current behavior first, including its bugs, before touching it:
test('normalizeData drops empty slot keys (current, possibly wrong, behavior)', () => {
  expect(normalizeData(sampleData)).toEqual(prunedData)
})
// 2. Now refactor with this test as the tripwire.
```
_Avoid_: refactoring or "fixing" a function in the same diff that adds its first test; a first test that asserts the "correct" answer instead of the current one
Detect: a diff that changes control flow or structure of a function with zero pre-existing test coverage, where the new/only test was added in the same diff and asserts a value that differs from what the old code actually produced
Not-when: the code is throwaway/prototype tier, or you're deleting the function outright — there's no need to characterize behavior you're removing
