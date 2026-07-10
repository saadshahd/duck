---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
Reserved machinery must earn its weight against a named trigger. An abstraction (interface, strategy, plugin point) with exactly one implementer and no second call site in sight is speculative generality — the trigger hasn't arrived yet, but the machinery already has.
WRONG:
```ts
interface RoleClassifier { classify(type: string): ComponentSlotType }
class DefaultRoleClassifier implements RoleClassifier { classify(t: string) { return roles[t]; } }
const classifier: RoleClassifier = new DefaultRoleClassifier();
```
RIGHT:
```ts
const roleOf = (roles: Record<string, ComponentSlotType>, type: string) => roles[type];
// promote to a Record<tag, fn> interpreter only when a second, behaviorally-different member actually shows up
```
_Avoid_: `interface`/abstract base class with a single concrete subclass; a `Record`/handler map with only one key; a config option that's never read with any value but its default.
Detect: search for interfaces or strategy classes with exactly one implementation, or dependency-injected seams with exactly one registered provider — each is a "reserved" pattern (per data-as-spec-earns-its-trigger) installed before its trigger fired.
Not-when: the seam exists because you've already named the second member arriving in a scoped-and-dated piece of work — that's a deliberate seam (Fowler: prudent-deliberate technical debt), not speculative generality. The difference is whether you can name the trigger out loud, today, not whether it's currently unused.
Cross-ref: the delete-vs-date ladder (deletion-test-before-any-abstraction-ships · speculative-generality-guard · seam-earns-existence-at-second-adapter · colocate-then-lift-on-second-consumer): judge an unused abstraction in this order — (1) COUNT: a second consumer/adapter already exists (a test double counts) → it has earned existence; (2) DATED TRIGGER: the second member is named in scoped, scheduled work today → a deliberate seam; the schedule is the license; (3) otherwise the DELETION TEST rules → cut. The defect is never the seam itself — it is the unscheduled one.
