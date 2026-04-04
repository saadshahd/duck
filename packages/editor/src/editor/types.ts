import type { Spec } from "@json-render/core";
import type { ZodTypeAny } from "zod";

/** Push a new spec snapshot into the history stack. */
export type SpecPush = (spec: Spec, label: string, group?: string) => void;

export type ComponentCatalogEntry = {
  description: string;
  props: ZodTypeAny;
  slots?: string[];
};
export type ComponentCatalog = Record<string, ComponentCatalogEntry>;
