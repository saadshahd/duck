---
paths: "packages/editor/**/*.{tsx,jsx}"
---
when: [react] · tier: standard · check: judgeable
An effect exists only to synchronize a component with something outside React (network, DOM API, subscription, third-party widget). Never mirror a prop/state value into another `useState` via `useEffect`, and never use an effect to react to a state change and set more state — compute derived values inline during render.
WRONG:
```tsx
const [label, setLabel] = useState('');
useEffect(() => {
  setLabel(`${field.label ?? field.name} (${field.type})`);   // mirroring props into state via an effect
}, [field]);
```
RIGHT:
```tsx
const label = `${field.label ?? field.name} (${field.type})`;   // derived inline during render
```
_Avoid_: a `useState` whose only writer is a `useEffect` reading other state/props with no external system; `useEffect` bodies whose only externally-visible action is a `set*` call — no `fetch`, subscription, DOM mutation, or non-React API in sight.
Detect: a `useEffect` whose dependency array is composed entirely of props/state already in scope, whose body calls exactly one `set*` and touches no DOM/network/subscription (a deterministic first-pass filter); read the effect body top-to-bottom and ask what it talks to outside the component tree — if the answer is "nothing, just more React state," it's a missed derivation or a missed event handler.
Not-when: the value must persist across a remount, or the "sync" is resetting local state in response to a changed `key`/identity (the key-reset pattern); the effect genuinely bridges to an imperative API (canvas, video element, third-party map/chart widget) that React doesn't model.
