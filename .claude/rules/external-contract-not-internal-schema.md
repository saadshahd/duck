---
paths:
  - "packages/mcp-server/**/*.{ts,tsx}"
  - "packages/spec/**/*.{ts,tsx}"
---
when: [distributed] · tier: standard · check: deterministic
What crosses a boundary is an explicit, versioned contract with a descriptive (self-describing) schema — never your internal relational/ORM entity leaked directly; consumers branch on the stated version rather than assuming the sender's "now" shape.
WRONG:
```ts
ws.send(JSON.stringify(await storage.readDraft(page)))   // internal draft store shape = wire message
```
RIGHT:
```ts
type ServerMessage = { type: "spec-update"; data: Data; label?: string } | { type: "capture-request"; id: string }
const toMessage = (data: Data): ServerMessage => ({ type: "spec-update", data })   // explicit map, tagged by `type`
ws.send(JSON.stringify(toMessage(await storage.readData(page))))
```
_Avoid_: returning an ORM/DB entity or `findRaw`/`.toJSON()` of an internal model straight from a handler; a cross-boundary message/DTO type with no `schema`/`version`/`type` version tag; consumers reading a foreign message with no version branch.
Detect: an HTTP/queue handler serializing an internal persistence type without a mapping step; message/event type definitions lacking an explicit version discriminant; a consumer that destructures a foreign payload without checking its version.
Not-when: the type is used only inside one service's own boundary (inside-data), never serialized across a process/service/third-party edge.
