import type { ComponentData } from "@puckeditor/core";
import { Result } from "neverthrow";

const FRAGMENT_TAG = "puck-fragment";

type Fragment = { _tag: typeof FRAGMENT_TAG; component: ComponentData };

const parseJson = Result.fromThrowable(
  (text: string): unknown => JSON.parse(text),
  () => "invalid-json" as const,
);

const isFragment = (value: unknown): value is Fragment =>
  typeof value === "object" &&
  !!value &&
  (value as { _tag?: unknown })._tag === FRAGMENT_TAG &&
  !!(value as { component?: unknown }).component;

const serialize = (component: ComponentData): string =>
  JSON.stringify({ _tag: FRAGMENT_TAG, component } satisfies Fragment);

const parse = (text: string): ComponentData | undefined =>
  parseJson(text)
    .map((value) => (isFragment(value) ? value.component : undefined))
    .unwrapOr(undefined);

export const Fragment = { serialize, parse } as const;
