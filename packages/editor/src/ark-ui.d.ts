// @ark-ui/react@5.37.1 ships a broken types layout: its package `exports` and
// `types` fields point at `dist/<subpath>/index.d.ts`, but the actual `.d.ts`
// files live one level deeper under `dist/src/<subpath>/`. Runtime resolution
// (Vite, bun) finds the real `.js` correctly via the exports map; only tsc fails
// to locate the declarations. These ambient modules re-export the real type
// barrels (by relative path, so they bypass the broken `exports` map) so the
// subpath imports type-check, without redirecting runtime resolution — a
// tsconfig `paths` redirect would break bun:test by sending it to the type-only
// `dist/src` dir. Remove once Ark fixes its published types layout.

declare module "@ark-ui/react/toggle-group" {
  export {
    ToggleGroup,
    ToggleGroupItem,
    ToggleGroupRoot,
  } from "../../../node_modules/@ark-ui/react/dist/src/components/toggle-group/index.d.ts";
}

declare module "@ark-ui/react/environment" {
  export { EnvironmentProvider } from "../../../node_modules/@ark-ui/react/dist/src/providers/environment/index.d.ts";
}
