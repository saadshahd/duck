import type { Effect } from "effect";
import type { Data } from "@puckeditor/core";
import type { InvalidPageName, NotFound, StorageError } from "./errors.js";

export interface PageInfo {
  readonly name: string;
  readonly componentCount: number;
  readonly hasDraft: boolean;
}

export interface Storage {
  listPages(): Effect.Effect<PageInfo[], StorageError>;
  readData(
    page: string,
  ): Effect.Effect<Data, NotFound | StorageError | InvalidPageName>;
  writeData(
    page: string,
    data: Data,
  ): Effect.Effect<void, StorageError | InvalidPageName>;
  readDraft(
    page: string,
  ): Effect.Effect<Data | null, StorageError | InvalidPageName>;
  writeDraft(
    page: string,
    data: Data,
  ): Effect.Effect<void, StorageError | InvalidPageName>;
  commitDraft(
    page: string,
  ): Effect.Effect<void, NotFound | StorageError | InvalidPageName>;
  discardDraft(
    page: string,
  ): Effect.Effect<void, StorageError | InvalidPageName>;
}
