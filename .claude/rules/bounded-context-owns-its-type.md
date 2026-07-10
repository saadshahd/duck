---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
When two parts of the system use the same domain word for something that behaves differently in each, each side defines its own type for that word — never import one context's version of "Product"/"Order"/"User" into another context's domain logic.
WRONG:
```ts
// editor/selection/use-selection.ts
import { SelectionData } from "@duckeditor/spec"; // the bridge's selection carries wire fields the editor's model has no business tracking
function focus(selection: SelectionData) { /* only needs the focused id */ }
```
RIGHT:
```ts
// editor's own shape for "what's selected"
type SelectionState = { selectedIds: ReadonlySet<string>; lastSelectedId: string | null };
function focus(state: SelectionState) { /* ... */ }
// translate at the bridge boundary, once: SelectionData -> SelectionState
```
_Avoid_: a domain module importing another domain module's entity type and reaching into fields that belong to the other context's concerns.
Detect: trace imports of exported domain types across module/folder boundaries; flag a consumer that only uses a subset of an imported type's fields — that subset is the real type it needed.
Not-when: the "shared" type is a genuinely cross-context primitive (an `Id`, a `Money` value object) with no context-specific behavior — those belong at the common ancestor per place-code-where-it-would-be-found, not duplicated.
Cross-ref: feature-envy-misplacement — same smell family, different move: when the mismatch is TYPE ownership (two contexts sharing one domain word), each context defines its own type and translates at the boundary (this rule); when it is FUNCTION placement (a function reading mostly another domain's fields), move the function to the domain it envies.
