---
paths: "**/*.{ts,tsx}"
---
when: [always] · tier: high-stakes · check: judgeable
Data crossing an untyped boundary (HTTP body, DB row, env var, third-party SDK response, `JSON.parse`) must be parsed into the domain type at that boundary and never trusted via a type assertion further downstream.
WRONG:
```ts
async function readData(page: string): Promise<Data> {
  const raw = await Bun.file(`pages/${page}/spec.json`).text();
  return JSON.parse(raw) as Data; // asserted, never checked
}
```
RIGHT:
```ts
async function readData(page: string): Promise<Result<Data, ParseError>> {
  const raw = await Bun.file(`pages/${page}/spec.json`).text();
  return Data.parse(JSON.parse(raw));
  // parse :: unknown => Result<Data, ParseError> — the one boundary where raw becomes typed
}
```
_Avoid_: `as Order`, `as any as Order`, or a generic type parameter on `fetch`/`JSON.parse` standing in for validation.
Detect: an `as <DomainType>` cast, or a bare type parameter, applied directly to the output of `fetch`, `JSON.parse`, a DB client call, or `process.env` — with no schema/parse call between the raw value and the cast.
Not-when: the value already came from a parse step earlier in the same call chain and is being re-narrowed for convenience (e.g. narrowing `unknown` to a known-good local variable inside the same function that just validated it).
