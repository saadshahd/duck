# Duck

Zero-chrome visual editor for [Puck](https://github.com/measuredco/puck) documents. AI agents compose via MCP, designers review and steer.

Duck = Puck's `<Render>` + shadow-DOM overlay — no iframe, no chrome.

## Packages

| Package | Description |
|---------|-------------|
| `packages/editor` | React 19 editor component |
| `packages/mcp-server` | MCP server + HTTP/WebSocket bridge |
| `packages/spec` | Puck data tree utilities (`@duck/spec`) |
| `packages/patterns` | Pattern matching and slot-merge engine (`@duck/patterns`) |

## Dev

```sh
bun install
bun run dev        # Vite on :5173
bun run typecheck  # All packages
bun test           # Unit tests
bunx playwright test --project=chromium  # E2E
```
