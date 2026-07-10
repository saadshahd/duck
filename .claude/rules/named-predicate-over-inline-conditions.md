---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Extract a predicate of 2+ conditions into a named function. The name reveals intent (`isEligible`), not implementation (`hasActiveStatusAndVerifiedEmail`) — if the name just spells out the boolean expression, it documents nothing the code didn't already say.
WRONG:
```ts
if (comp.type === 'Root' && slotKeysOf(comp).length > 0 && comp.props.id != null) {
  select(comp);
}
```
RIGHT:
```ts
const isSelectableRoot = (comp: ComponentData) =>
  comp.type === 'Root' && slotKeysOf(comp).length > 0 && comp.props.id != null;
if (isSelectableRoot(comp)) select(comp);
```
_Avoid_: a compound boolean of 2+ clauses inline in an `if`/`?:`; a predicate name that stacks its own conditions with `And`/`Or`.
Detect: `&&`/`||` joining 2+ comparisons directly inside a conditional; or a boolean-returning name containing `And`/`Or` or a field name from its own body.
Not-when: a single self-evident condition (`if (!user)`) — naming one truthiness check adds a hop without adding meaning.
Cross-ref: duplication-taxonomy-triage — the same predicate re-derived across files is tier-three duplication.
