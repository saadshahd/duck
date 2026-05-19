# @duckeditor/core

Zero-chrome visual editor for [Puck](https://puckeditor.com) documents. Renders
production output via `<Render>` and layers editing controls on top in a Shadow
DOM overlay.

## Install

```sh
npm install @duckeditor/core @puckeditor/core react react-dom
# Optional: for the morph picker
npm install @duckeditor/patterns
```

## Usage

```tsx
import "@duckeditor/core/setup"; // MUST run before react-dom/client
import { createRoot } from "react-dom/client";
import { Editor } from "@duckeditor/core";
import config from "./puck.config";

createRoot(document.getElementById("root")!).render(
  <Editor data={{}} config={config} onChange={(data) => save(data)} />,
);
```

The `setup` import installs the React DevTools hook (via `bippy`) that powers
Duck's selection layer. It must evaluate before React.

`data` accepts `Partial<Data>` — pass `{}` to start from a blank document and
Duck will fill in defaults (`{ root: { props: {} }, content: [], zones: {} }`).

## Interop with `<Puck>`

`<Editor>` is a sibling of `<Puck>`, not a drop-in replacement. It accepts a
deliberate subset of Puck's prop surface — see [INTEROP.md](./INTEROP.md) for
the full contract.
