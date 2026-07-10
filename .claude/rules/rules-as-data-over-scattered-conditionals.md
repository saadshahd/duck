---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Express validation and policy as typed records interpreted by ONE engine — never scatter `if`-checks for a policy that has more than one rule. The policy must be inspectable as data, not reconstructed by reading code paths. Before writing a conditional chain for a policy, look for the declarative form.
WRONG:
```ts
function selectContent(slot: PatternSlot, matched: ComponentData[]) {
  if (isRequired(slot.cardinality) && matched.length === 0) return err({ kind: 'required-slot-empty' });
  if (!isPlural(slot.cardinality) && matched.length > 1) return err({ kind: 'over-count' });
  if (matched.some((c) => !slot.accepts.includes(roleOf(c)))) return err({ kind: 'wrong-role' });
}
```
RIGHT:
```ts
const slotRules = [
  { when: 'required slot has no match', reject: 'required-slot-empty', test: (s: PatternSlot, m: ComponentData[]) => isRequired(s.cardinality) && m.length === 0 },
  { when: 'singular slot matched more than once', reject: 'over-count', test: (s: PatternSlot, m: ComponentData[]) => !isPlural(s.cardinality) && m.length > 1 },
];
const evaluate = (s: PatternSlot, m: ComponentData[]) => slotRules.find((r) => r.test(s, m))?.reject;
```
The `when` predicates MAY be written as readable natural-language string literals so the rules array reads as domain documentation on its own, without opening the interpreter.
_Avoid_: a function whose body is a wall of `if (...) return reject(...)` for a multi-rule policy; the same policy re-expressed as branches in more than one place.
Detect: a sequence of independent `if` guards that each reject/accept against one policy — they collapse into a rules array walked by a single evaluator.
Not-when: a single condition, or genuinely unrelated branches that don't form one inspectable policy.
Cross-ref: restart-policy-as-data — the same shape applied to supervision policy; lookup-table-over-conditional-chain — the degenerate case where the rule is a pure static mapping.
