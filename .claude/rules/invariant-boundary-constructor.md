---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: deterministic
A type that enforces a domain rule/invariant is built and mutated through exactly ONE named factory per type that states the rule — never a raw constructor, object literal, or spread from outside its own module, and the invariant is never re-checked ad hoc at each call site.
WRONG:
```ts
const registry = { patterns, roleIndex, slotIndex } as PatternRegistry;
// indexes threaded through construction to fake state the type should own and keep consistent
```
WRONG (different situation — the invariant re-checked per call site instead of enforced once):
```ts
if (slot.children.length > 0) insert({ ...draft, filledSlot: slot })
// ...the same children.length check re-appears at another call site, bypassable via spread
```
RIGHT:
```ts
const PatternRegistry = {
  create: (patterns: SectionPattern[]): Result<PatternRegistry, RegistryError> => /* the one seam */ ...
}
// create :: SectionPattern[] => Result<PatternRegistry, RegistryError>  (role/slot indexes derived, always consistent)
```
_Avoid_: exported classes with public multi-arg constructors (3+ positional params) callable from outside their own module; exported object-literal constructors for an aggregate; `{ ...registry, roleIndex: X }` spread from outside the aggregate's module; booleans or nulls threaded through construction to represent a state the type should already know.
Detect: `new <PascalCase>(` call sites outside the type's own module; constructors/object literals with 3+ positional or unlabeled fields; an aggregate-shaped value built or mutated via object literal / spread in a module that doesn't own that type; the same invariant check re-appearing at 2+ call sites.
Not-when: the type is a plain data record / DTO with no invariant to protect (a wire-schema shape passed straight through); read-only projections / DTOs.
