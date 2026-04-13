import { Data } from "effect";

export class NotFound extends Data.TaggedError("NotFound")<{
  readonly entity: string;
  readonly key: string;
}> {
  get hint() {
    const hints: Record<string, string> = {
      page: `Page '${this.key}' not found. List available pages first.`,
      draft: `No draft for '${this.key}'. Apply changes first to create one.`,
      component: `Component '${this.key}' not in catalog. Fetch the component list first.`,
    };
    return hints[this.entity];
  }
}

export class StorageError extends Data.TaggedError("StorageError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  get hint() {
    return "Storage operation failed. Check write access to the project directory.";
  }
}

export class InvalidPageName extends Data.TaggedError("InvalidPageName")<{
  readonly name: string;
  readonly reason: string;
}> {
  get hint() {
    return `Page name '${this.name}' is invalid. ${this.reason}.`;
  }
}

export class PatchError extends Data.TaggedError("PatchError")<{
  readonly message: string;
  readonly failedOpIndex?: number;
}> {
  get hint() {
    return this.failedOpIndex !== undefined
      ? `Patch at index ${this.failedOpIndex} failed: ${this.message}. No changes applied.`
      : this.message;
  }
}

export class QueryError extends Data.TaggedError("QueryError")<{
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {
  get hint() {
    return this.message;
  }
}

export class CatalogLoadError extends Data.TaggedError("CatalogLoadError")<{
  readonly path: string;
  readonly reason: string;
}> {
  get hint() {
    return `Could not load catalog from '${this.path}'. ${this.reason}.`;
  }
}
