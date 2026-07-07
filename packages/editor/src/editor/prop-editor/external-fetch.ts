import type { Field } from "@puckeditor/core";

type ExternalUnion = Extract<Field, { type: "external" }>;
type ExternalAdaptorField = Extract<ExternalUnion, { adaptor: unknown }>;
type ExternalDirectField = Exclude<ExternalUnion, ExternalAdaptorField>;

export type ExternalQuery = {
  query: string;
  filters: Record<string, unknown>;
};

/** Fetch the external option list, threading the live search `query` and
 *  `filterFields` values through to the field's `fetchList`. Direct fields honor
 *  the query/filters contract; adaptor fields fetch by their static params.
 *  A null result degrades to an empty list — never dropped silently. */
export const fetchExternal = (
  field: ExternalUnion,
  { query, filters }: ExternalQuery,
): Promise<unknown[]> => {
  if ("adaptor" in field) {
    const f = field as ExternalAdaptorField;
    return f.adaptor.fetchList(f.adaptorParams).then((rows) => rows ?? []);
  }
  const f = field as ExternalDirectField;
  return f.fetchList({ query, filters }).then((rows) => rows ?? []);
};

/** The stored prop value for a picked option: `mapProp` when declared, else the
 *  raw item. */
export const externalMapProp = (
  field: ExternalUnion,
): ((item: unknown) => unknown) =>
  "adaptor" in field
    ? ((field as ExternalAdaptorField).adaptor.mapProp ?? ((item) => item))
    : ((field as ExternalDirectField).mapProp ?? ((item) => item));

/** Seed the search query from `initialQuery`. */
export const initialQuery = (field: ExternalUnion): string =>
  "adaptor" in field ? "" : ((field as ExternalDirectField).initialQuery ?? "");

/** Seed filter values from `initialFilters`. */
export const initialFilters = (
  field: ExternalUnion,
): Record<string, unknown> =>
  "adaptor" in field
    ? {}
    : ((field as ExternalDirectField).initialFilters ?? {});
