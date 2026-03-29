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
