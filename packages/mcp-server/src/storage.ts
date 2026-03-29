import type { Effect } from "effect";
import type { Spec } from "@json-render/core";
import type { InvalidPageName, NotFound, StorageError } from "./errors.js";

export interface PageInfo {
  readonly name: string;
  readonly elementCount: number;
  readonly hasDraft: boolean;
}

export interface Storage {
  listPages(): Effect.Effect<PageInfo[], StorageError>;
  readSpec(
    page: string,
  ): Effect.Effect<Spec, NotFound | StorageError | InvalidPageName>;
  writeSpec(
    page: string,
    spec: Spec,
  ): Effect.Effect<void, StorageError | InvalidPageName>;
  readDraft(
    page: string,
  ): Effect.Effect<Spec | null, StorageError | InvalidPageName>;
  writeDraft(
    page: string,
    spec: Spec,
  ): Effect.Effect<void, StorageError | InvalidPageName>;
  commitDraft(
    page: string,
  ): Effect.Effect<void, NotFound | StorageError | InvalidPageName>;
  discardDraft(
    page: string,
  ): Effect.Effect<void, StorageError | InvalidPageName>;
}
