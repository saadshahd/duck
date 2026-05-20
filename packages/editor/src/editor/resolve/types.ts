export type { ResolveTrigger } from "../types.js";

export type ResolveError =
  | { kind: "unserializable-input"; id: string; cause: unknown }
  | { kind: "resolver-failed"; id: string; cause: unknown };
