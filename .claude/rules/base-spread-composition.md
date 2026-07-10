---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
When 2+ shaped values share a non-trivial core, define the core ONCE and build each variant by spreading it and adding only its delta; type the result as `Base & Delta`. Never copy the shared fields across variant literals — copies drift the moment one side changes and the other is forgotten.
WRONG:
```ts
const heading = { id, editMode: true, theme: 'light', type: 'Heading', text };
const button = { id, editMode: true, theme: 'light', type: 'Button', label };
const image = { id, editMode: true, theme: 'light', type: 'Image', src };
```
RIGHT:
```ts
const base = { id, editMode: true, theme: 'light' };
const heading = { ...base, type: 'Heading', text };
const button = { ...base, type: 'Button', label };
const image = { ...base, type: 'Image', src };
```
_Avoid_: three or more object literals each restating the same run of base fields; a variant type declared by re-listing shared members instead of intersecting a base.
Detect: 2+ object literals (or type declarations) in the same module that repeat an identical sequence of field names before their differing tail.
Not-when: the shared fields are coincidental — same names, unrelated meaning — where extracting a base would assert a relationship that doesn't exist.
