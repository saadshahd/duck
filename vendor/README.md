# vendor

## `puckeditor-core-0.22.0.tgz`

The published `@puckeditor/core@0.22.0` imports `react-dom` at runtime but lists it
only in `devDependencies` — never as a peer. Under the hoisted linker that resolved
by accident. Under `linker = "isolated"` with `globalStore = true` it cannot: the
store lives outside the project tree, so Puck resolves only what its own manifest
declares, and rendering fails with `Cannot find package 'react-dom'`.

This tarball is the untouched 0.22.0 release with one line added to its
`package.json`:

```json
"peerDependencies": { "react": "...", "react-dom": "^18.0.0 || ^19.0.0" }
```

The root `package.json` points every resolution at it:

```json
"overrides": { "@puckeditor/core": "file:../../vendor/puckeditor-core-0.22.0.tgz" }
```

The path is relative to the *consuming* package, not the repo root — bun resolves
override `file:` paths from each dependent, and all dependents sit at
`packages/<name>/`.

`bun patch` does **not** work for this. Bun computes the peer graph from the
registry manifest during resolution, before patches are applied, so a patched
`peerDependencies` never changes what gets linked. `publicHoistPattern` does not
work either — it hoists into the project root, which a stored package never walks
into.

### Retiring this

Drop the tarball, delete the `overrides` entry, and restore the plain `^0.22.x`
range as soon as Puck declares `react-dom` as a peer. Not fixed as of 0.22.2 or
any 0.23 canary. Upstream: https://github.com/measuredco/puck

### Rebuilding it

```sh
curl -sL "$(npm view @puckeditor/core@0.22.0 dist.tarball)" -o puck.tgz
mkdir x && tar -xzf puck.tgz -C x
# add react-dom to peerDependencies in x/package/package.json
(cd x && tar -czf ../puckeditor-core-0.22.0.tgz package)
```
