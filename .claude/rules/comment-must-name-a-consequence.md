---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Inline comments are a smell: if a line needs explaining, rename, extract, or restructure until it doesn't. Block comments are acceptable only where the code cannot be made self-describing — a regulatory constraint, a non-obvious performance decision, a workaround for an external bug — and they explain WHY, never WHAT. A `//` comment survives only when omitting it would let a future editor silently break a non-obvious constraint, so it MUST name a consequence or an external-system mapping. A comment that paraphrases the line it sits on is deleted.
WRONG:
```ts
// increment the current index
ctx.currentIndex += 1;
// map over slot keys and collect their child arrays
const slots = slotKeysOf(component).map(k => component.props[k]);
```
RIGHT:
```ts
// re-mint before insert — two subtrees sharing an id corrupts findById lookups
const fresh = remintIds(data, preservedIds);
// apply :: (ComponentData, SectionPattern) => Result<MergeResult, MergeError>
const apply = pipe(match, merge);
```
_Avoid_: a comment that restates the code beneath it in English; a WHAT-narration of a loop, assignment, or call; step-by-step narration of a function body.
Detect: read each comment against its line — if the line's identifiers already say what the comment says, delete it. A surviving comment must point at something the code cannot show: a law, an external system's behavior, a consequence of removal. The sole sanctioned inline exception is a Hindley-Milner type signature over an argument-free point-free binding, documenting SHAPE only.
Not-when: the comment encodes a genuine external constraint (regulation, a documented upstream bug, a measured performance tradeoff) that the code cannot express on its own — keep it, and make it name the WHY.
