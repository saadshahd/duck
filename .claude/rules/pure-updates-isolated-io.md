---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: standard · check: judgeable
The invariant is universal: an update to a shared state tree returns a NEW tree — never mutate in place — and the IO that triggered it lives at the edge, never threaded into the update. The named-optic/lens MECHANISM is project-idiom-gated: where optics are already the house style, reach for a named optic at nested or multi-field updates; where they are not, plain spread updates satisfy the same invariant. Never impose optics on a project that doesn't already use them.
WRONG:
```ts
async function removeChild(data: Data, id: string) {
  const parent = findParent(data, id);
  data.content.splice(parent!.index, 1); // in-place mutation of the shared tree
  await storage.writeDraft(page, data);  // IO threaded into the update
  return data;
}
```
RIGHT:
```ts
const removeChild = (data: Data, id: string): Data => ({
  ...data,
  content: data.content.filter((c) => c.props.id !== id),
});
// the caller at the edge performs the IO: const next = removeChild(...); await storage.writeDraft(page, next);
```
_Avoid_: assigning into a field of a shared state tree; `await`/`fetch`/`db.*`/logging inside an update function instead of at the calling edge.
Detect: an update function that assigns to a property of its input tree, or that performs IO in its body — both violate the invariant regardless of the project's optic idiom.
Not-when: the value is genuinely local and un-shared — an ordinary local mutation before it escapes is fine; the invariant governs shared state trees. And absent an optics house style, don't add a lens library to satisfy it — a spread is enough.
Cross-ref: place-not-value-for-shared-mutable-state — why the invariant exists; no-mutable-shared-return — the same discipline at a function's return boundary.
