import { Effect } from "effect";
import type { CatalogData } from "../protocol.js";

export const catalog = (data: CatalogData) =>
  Effect.succeed({ catalog: data.json, prompt: data.prompt });
