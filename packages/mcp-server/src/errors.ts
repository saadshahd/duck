import { Data } from "effect";

export class NotFound extends Data.TaggedError("NotFound")<{
  readonly entity: string;
  readonly key: string;
}> {
  // fallow-ignore-next-line unused-class-member
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
  // fallow-ignore-next-line unused-class-member
  get hint() {
    return "Storage operation failed. Check write access to the project directory.";
  }
}

export class InvalidPageName extends Data.TaggedError("InvalidPageName")<{
  readonly name: string;
  readonly reason: string;
}> {
  // fallow-ignore-next-line unused-class-member
  get hint() {
    return `Page name '${this.name}' is invalid. ${this.reason}.`;
  }
}

export class QueryError extends Data.TaggedError("QueryError")<{
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {
  // fallow-ignore-next-line unused-class-member
  get hint() {
    return this.message;
  }
}

export class CatalogLoadError extends Data.TaggedError("CatalogLoadError")<{
  readonly path: string;
  readonly reason: string;
}> {
  // fallow-ignore-next-line unused-class-member
  get hint() {
    return `Could not load catalog from '${this.path}'. ${this.reason}.`;
  }
}
