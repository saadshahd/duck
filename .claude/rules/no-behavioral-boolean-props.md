---
paths: "packages/editor/**/*.{tsx,jsx}"
---
when: [react] · tier: standard · check: deterministic
Never add `loading?`, `disabled?`, `fullWidth?`, or any behavioral boolean prop to a component's props type — not even one. These are composition concerns, not props. "Loading support" is a SEPARATE wrapper component: a `LoadingButton` wraps `Button`, sets `disabled`, and injects a spinner through the icon slot — the `Button` itself has NO loading prop. `fullWidth` is a CSS class or a `<FullWidth>` layout wrapper. Compose through `children` and slots (`React.ReactNode`).
WRONG:
```tsx
type SwatchProps = { loading?: boolean; disabled?: boolean; fullWidth?: boolean };
function Swatch({ loading, fullWidth, ...p }: SwatchProps) { ... }
```
RIGHT:
```tsx
function Swatch({ icon, children, ...p }: { icon?: ReactNode; children: ReactNode }) { ... }
function ResolvingSwatch(p: SwatchProps) {
  return <Swatch disabled icon={<Spinner />} {...p} />;   // behavior composed, not a prop
}
```
_Avoid_: `loading?: boolean`, `disabled?: boolean`, `fullWidth?: boolean`, or any behavioral flag in a component's props type; a base component that grows variant behavior through boolean toggles instead of wrappers and slots.
Detect: grep component props types for `loading?: boolean`, `disabled?: boolean`, `fullWidth?: boolean` and other behavioral boolean fields — each should be a wrapper component, a CSS class, or a slot instead.
Not-when: discriminated unions over a domain model's own props — the ban is on behavioral variant toggles, not on modeling genuine domain states, and not on variant props where a discriminated union's narrowing tax would exceed its benefit.
