---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
When two properties, fields, or branches of one construct change for different reasons, that construct is complected, not cohesive — split it into two things joined by an explicit relationship. The defect was never repeated text — it is a single construct forced to represent two concepts.
WRONG:
```ts
type EditorContext = { selectedId: string; dragSourceId: string; sheetScrollTop: number }
// cross-domain pointer/drag and prop-sheet scroll both mutate this one type for unrelated reasons
```
RIGHT:
```ts
type EditorContext = { selectedId: string; dragSourceId: string }  // changes with pointer + drag coordination
type SheetView = { scrollTop: number }                             // changes with prop-sheet layout rules
```
_Avoid_: one type, one file, or one function whose edits are attributed in git blame to two unrelated feature teams or tickets.
Detect: grep the last N commits touching a file/type — if the diffs cluster into two causally unrelated stories (selection changes vs. prop-sheet changes) touching the *same* declared shape, that shape is complected.
Not-when: the fields co-occur because they are the SAME axis at different times (a state-modeling union) — that's cohesion, not complecting; the test is "different reasons," not "different fields."
Cross-ref: duplication-taxonomy-triage — the inverse move: that rule extracts one concept spread across copies; this rule splits one construct serving two reasons to change.
