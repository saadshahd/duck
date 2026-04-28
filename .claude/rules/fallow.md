---
description: Rules for using fallow boundary enforcement and codebase intelligence
globs: packages/**
---

## Architecture boundary enforcement

Boundary zones are defined in `.fallowrc.json` at the repo root. The config encodes the documented Shell→Domain→Infrastructure layers and cross-package rules.

**Zone map:**

| Zone | Paths | Can import from |
|------|-------|-----------------|
| `spec-pkg` | `packages/spec/**` | Nothing in this project |
| `mcp-server-pkg` | `packages/mcp-server/**` | `spec-pkg` only |
| `editor-shell` | `src/editor/shell.tsx`, `src/editor/shell/**` | All editor zones + `spec-pkg` |
| `editor-infra` | `src/editor/{fiber,overlay,machine,layout,spec-ops,bridge,duck-render}/**`, root-level `animated-update.ts`, `types.ts` | `spec-pkg` only |
| `editor-domain-*` | One zone per domain subfolder | `editor-infra` + `spec-pkg` only |

Domain subfolders (10 zones): `selection`, `drag`, `box-model`, `prop-editor`, `history`, `keyboard`, `context-menu`, `clipboard`, `insert`, `ghost`

## When to run fallow

- **After adding a new domain subfolder**: add its zone to `.fallowrc.json` — fallow won't enforce it until the zone exists
- **After moving code between layers**: run `bun run boundaries` to verify no new violations
- **Before declaring an architectural change complete**: `bun run boundaries` must exit clean
- **Before editing a file with non-obvious imports**: use the MCP `trace_file` tool to see its full import graph

```bash
bun run boundaries   # boundary violations only (fast)
npx fallow           # full report: dead code + duplication + health
```

## On a boundary violation

| Violation | Action |
|-----------|--------|
| `editor-infra` imports a domain module | Fix: extract the shared concept to infra, or pass it via the shell |
| `editor-domain-X` imports `editor-domain-Y` | Fix: move shared logic to infra; shell wires domains via props |
| `mcp-server-pkg` imports editor package | Fix: use `spec-pkg` or `@puckeditor/core` directly |
| Intentional exception with documented reason | Add fallow suppression comment — must be narrow (file-level, not dir-level) |

Never suppress with broad patterns. Each exception requires a stated reason.

## On adding a new domain subfolder

```jsonc
// Add to .fallowrc.json boundaries.zones:
{ "name": "editor-domain-<name>", "root": "packages/editor/", "patterns": ["src/editor/<name>/**"] }

// Add to boundaries.rules:
{ "from": "editor-domain-<name>", "allow": ["editor-infra", "spec-pkg"] }

// Add to the editor-shell rule's allow list:
"editor-domain-<name>"
```

## MCP tools (fallow server in .mcp.json)

Use these mid-task via the `fallow` MCP server:

- `trace_file` — see all imports into/from a file before editing it
- `list_boundaries` — inspect the configured zones and their rules
- `analyze` — full dead-code + boundary report after a batch of changes
- `audit` — incremental check of changed files only (faster for PR review)
- `check_health` — complexity metrics, refactor targets

## Do NOT

- Add a new domain subfolder without registering its zone in `.fallowrc.json`
- Suppress boundary violations with glob patterns covering an entire directory
- Import `packages/mcp-server/` from the editor package or vice versa
- Define custom boundary zones outside `.fallowrc.json` — the config is the single source of truth
