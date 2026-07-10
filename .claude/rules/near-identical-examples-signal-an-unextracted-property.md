---
paths: "**/*.test.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Three or more test cases in one `describe` block that differ only in the literal input/output values, not in the assertion shape, are one un-stated universal property wearing example-test clothing — extract the property and delete the examples it subsumes.
WRONG:
```ts
test('finds the header', () => expect(findById(data, 'header')?.type).toBe('Heading'));
test('finds the cta', () => expect(findById(data, 'cta')?.type).toBe('Button'));
test('finds the stack', () => expect(findById(data, 'stack')?.type).toBe('Stack'));
test('finds the body', () => expect(findById(data, 'body')?.type).toBe('Text'));
```
RIGHT:
```ts
test('findById(data, node.id) returns that node', () => {
  // property + genData: a property runner over a generated domain,
  // whatever property library the project uses
  property(genData, (data) =>
    allIds(data).forEach((id) => expect(findById(data, id)?.props.id).toBe(id))
  );
});
```
_Avoid_: a run of `test(...)` calls in the same file with structurally identical bodies and only the numeric/string literals varying.
Detect: within one `describe`, count assertion bodies with identical AST shape modulo literals — 3+ is the threshold; the property that generalizes them is missing from the file.
Not-when: each case exercises a genuinely distinct code path (a different branch, a different error type) rather than the same computation at a different value — that's boundary/branch coverage, not a hidden property, and stays example-based.
Cross-ref: one-behavior-per-test — before extracting to a property, ask: do the cases differ in code PATH (branch taken / error type) or only in LITERALS? Path → keep them as named one-behavior examples; literals → collapse to one extracted property.
