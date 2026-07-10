---
paths: "**/*.test.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Write the test before the implementation exists so the test's shape pressures the interface — a function that's awkward to call from a test will be awkward to call from production, and you find out before it's load-bearing.
WRONG:
```ts
// implementation written first, ships
function add(data, parentId, slotPath, index, component, config, remint) { ... }
// test written after, contorts itself around the awkward signature
```
RIGHT:
```ts
// test written first, exposes the pain
it('adds a component at the root end', () => {
  expect(
    add(sample(), { site: { at: 'root' }, component: text('t1') }, config)
      ._unsafeUnwrap().content.map((c) => c.props.id)
  ).toEqual(['s1', 't1'])
})
// signature designed to be called this way, THEN implemented
```
_Avoid_: committing implementation and its first test in the same commit with no evidence the test shaped anything (5+ constructor params, config objects invented after the fact to patch a bad signature).
Detect: in the commit history, whether test files for new behavior are added/modified in the same commit as (or before) the implementation file, versus tests appearing only in a later "add tests" commit.
Not-when: throwaway/spike code nobody will call twice — skip TDD, let it throw, don't retrofit tests onto a script you're about to delete.
