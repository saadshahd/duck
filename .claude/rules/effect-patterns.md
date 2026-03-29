---
description: Effect v3 patterns for the MCP server
globs: packages/mcp-server/**
---

## Error modeling

- Define errors with `Data.TaggedError("Tag")<{ fields }>`. Every error has a unique `_tag`.
- Three categories: domain (`NotFound`), validation (`InvalidPageName`), infrastructure (`StorageError`).
- Infrastructure errors carry `cause?: unknown`. Domain/validation errors carry structured fields.
- No `try/catch`. No `throw`. All failures through the Effect error channel.
- Expected failures are typed errors. Unexpected failures are defects — let them crash.

## Pipeline vs generators

- **Pipeline** for 1–3 linear steps with no branching.
- **`Effect.gen`** for 4+ steps, branching, or when intermediate values are referenced more than once.
- Do NOT nest generators. Extract complex sub-workflows as named functions returning Effect.

## Wrapping platform I/O

- `Effect.tryPromise({ try, catch })` for async ops. `catch` MUST return a typed domain error.
- `Effect.try({ try, catch })` for sync fallible ops (e.g., `JSON.parse`).
- `Effect.promise(fn)` when the error is deliberately discarded (cleanup).
- No `@effect/platform` FileSystem. `tryPromise` wrappers are sufficient.
- All `node:fs` usage stays in `file-storage.ts`. Other modules see only `Storage`.

## Error recovery

- `catchTag("Tag", handler)` for specific error recovery. Inline at each call site.
- Do NOT extract `catchTag` into generic reusable helpers — they break TypeScript inference on the error channel. The repetition is acceptable.
- For ENOENT: catch the error from the actual operation, not from a pre-check. No TOCTOU (`fileExists` + operation = race condition).
- When ENOENT degrades gracefully (missing dir → empty list, missing draft → null), use `catchTag("StorageError", err => isEnoent(err.cause) ? Effect.succeed(fallback) : Effect.fail(err))`.
- When ENOENT means "not found" (semantic change to a different error type), map in `tryPromise.catch` with a typed return annotation: `catch: (err): NotFound | StorageError => isEnoent(err) ? new NotFound(...) : storageErr(...)`.

## Refinement

- `Effect.filterOrFail(predicate, () => error)` for boolean guards with typed failure.

## Collections with partial failure

- `Effect.option` to skip individual failures in `Effect.forEach`.
- Unwrap with `Option.isSome` filter, not direct `_tag` access.

## Architecture

- `Storage` is a plain interface. Implementations are factory functions.
- No `Context.Tag`, no `Layer`. Single-process, single-storage instance.
- `Effect.runPromise` / `Effect.runPromiseExit` at MCP handler boundary only.
- Revisit `Context.Tag`/`Layer` if 3+ interdependent services emerge.

## Testing

- Happy paths: `Effect.runPromise`.
- Error assertions: `Effect.flip` to swap error into success channel, then assert.
- Factory functions for test data. No fixtures, no mocks except `Storage` boundary.
- Co-locate: `foo.ts` → `foo.test.ts`.

## Do NOT

- `try/catch` or `throw`
- `Effect.runSync` (all storage is async)
- `Schema` for spec validation (`@json-render/core` owns that)
- God-object error types
- `Effect.all` with `concurrency: "unbounded"` for filesystem ops
