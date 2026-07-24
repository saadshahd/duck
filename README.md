# Duck

Zero-chrome visual editor for [Puck](https://github.com/measuredco/puck) documents. AI agents compose via MCP, designers review and steer.

Duck = Puck's `<Render>` + shadow-DOM overlay — no iframe, no chrome.

## Packages

| Package | Description |
|---------|-------------|
| `packages/editor` | React 19 editor component (`@duckeditor/core`) |
| `packages/mcp-server` | MCP server + HTTP/WebSocket bridge |
| `packages/spec` | Puck data tree utilities (`@duckeditor/spec`) |
| `packages/patterns` | Pattern matching and slot-merge engine (`@duckeditor/patterns`) |
| `packages/almond-catalog` | Almond design-system catalog and demo pages (`@duckeditor/almond-catalog`) |

## Dev

```sh
bun install
bun run dev        # Vite on :5173
bun run typecheck  # All packages
bun run test       # Unit tests (bun:test)
bun run e2e        # E2E (Playwright, chromium)
bun run boundaries # Architecture boundary check
```
