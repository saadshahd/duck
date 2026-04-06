import { Data } from "effect";

export class NotFound extends Data.TaggedError("NotFound")<{
  readonly entity: string;
  readonly key: string;
}> {}

export class StorageError extends Data.TaggedError("StorageError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class InvalidPageName extends Data.TaggedError("InvalidPageName")<{
  readonly name: string;
  readonly reason: string;
}> {}

export class PatchError extends Data.TaggedError("PatchError")<{
  readonly message: string;
  readonly failedOpIndex?: number;
}> {}

export class QueryError extends Data.TaggedError("QueryError")<{
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class CatalogLoadError extends Data.TaggedError("CatalogLoadError")<{
  readonly path: string;
  readonly reason: string;
}> {}
