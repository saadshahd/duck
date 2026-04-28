import { Effect } from "effect";
import type { Storage } from "../storage.js";

export const readDataOrDraft = (storage: Storage, page: string) =>
  Effect.gen(function* () {
    const draft = yield* storage.readDraft(page);
    if (draft) return draft;
    return yield* storage.readData(page);
  });
