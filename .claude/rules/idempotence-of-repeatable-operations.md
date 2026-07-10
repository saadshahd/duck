---
paths: "**/*.test.{ts,tsx}"
---
when: [always] · tier: standard · check: deterministic
Any operation documented or named as safe-to-repeat (normalize, sort, dedupe, sanitize, upsert) must satisfy `f(f(x)) === f(x)` for generated `x` — applying it twice is provably identical to applying it once.
WRONG:
```ts
test('fills defaults for empty object', () => {
  expect(normalizeData({})).toEqual({ content: [], root: { props: {} }, zones: {} });
});
```
RIGHT:
```ts
test('normalizeData is idempotent', () => {
  // property + genPartialData: a property runner over a generated domain,
  // whatever property library the project uses
  property(genPartialData, (d) =>
    expect(normalizeData(normalizeData(d))).toEqual(normalizeData(d))
  );
});
```
_Avoid_: a function name containing "normalize"/"sanitize"/"dedupe" with only single-application example tests in its suite.
Detect: grep the function's test file for `f(f(` or an idempotence-named test; absence when the function name promises repeatability is the smell.
Not-when: the operation is explicitly one-shot or stateful across calls (an ID generator, a counter increment) — idempotence isn't the claim being made, don't manufacture a law nobody asserted.
