---
name: editor-null-convention
description: The editor package uses null and T|null unions as its established convention, against global TASTE.md's no-null rule
metadata:
  type: project
---

The `packages/editor` package uses `null` values and `T | null` unions pervasively (XState context fields, `InsertTarget`, registry lookups, ~75 files). This is the package's settled convention, driven by XState context shape and React/Puck idioms.

**Why:** Global TASTE.md forbids `null` and `T | null`, but that rule does not govern the editor package — XState context and the floating-ui/Puck surfaces are built around `null`. The MCP/spec packages use neverthrow/Effect Result types instead.

**How to apply:** Do NOT flag new `string | null` / `T | null` in editor code as a real finding — it matches the dominant local pattern. Note it only as consistency context if asked. The neverthrow Result-type rule applies to spec-ops and fallible editor logic, not to nullable selection/registry state.
