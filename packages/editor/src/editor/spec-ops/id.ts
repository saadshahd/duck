import type { Data } from "@puckeditor/core";
import { allIds } from "@duckeditor/spec";

const randomSuffix = (): string => Math.random().toString(36).slice(2, 8);

/** A fresh `type-xxxxxx` id, unique against `taken`. */
export const mintId = (type: string, taken: ReadonlySet<string>): string => {
  const prefix = type.toLowerCase();
  let id = `${prefix}-${randomSuffix()}`;
  while (taken.has(id)) id = `${prefix}-${randomSuffix()}`;
  return id;
};

/** Every id currently in the tree — the collision set for minting. */
export const takenIds = (data: Data): Set<string> => new Set(allIds(data));
