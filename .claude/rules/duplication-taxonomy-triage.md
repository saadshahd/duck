---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
A single duplicated concept (not just duplicated text) is a defect — the cost of extraction is always less than the cost of divergence. Before extracting, name which of the four duplication tiers you're looking at — function, logic, concept, pattern — because each tier is progressively less visible to a diff tool and more dangerous to miss; a line-level diff only catches tier one.
WRONG:
```ts
// merge.ts
if (slot.cardinality === 'many' && slot.required && slot.allowed.length > 0) mergeInto(slot);
// registry.ts — same concept, silently missing the allowed check
if (slot.cardinality === 'many' && slot.required) indexSlot(slot);
```
RIGHT:
```ts
const isFillableSlot = (s: PatternSlot) =>
  s.cardinality === 'many' && s.required && s.allowed.length > 0;

if (isFillableSlot(slot)) mergeInto(slot);
if (isFillableSlot(slot)) indexSlot(slot);
```
_Avoid_: re-deriving the same predicate with slightly different clauses per call site; a threshold or business rule expressed as a literal in more than one file.
Detect: two or more `if`/ternary chains that reference the same 2+ domain fields together, even with different variable names or added/dropped clauses — a copy-paste detector won't flag this because the text differs; you have to read for the decision, not the syntax.
Not-when: the resemblance is coincidental — two unrelated domain rules that happen to share a shape today but have no reason to change together tomorrow. Forcing them into one function is coupling, not DRY.
Cross-ref: complecting-shared-construct-split-by-reason-to-change — the inverse move: splitting one over-merged construct rather than extracting a duplicated concept.
