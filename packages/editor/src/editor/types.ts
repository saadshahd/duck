import type { Spec } from "@json-render/core";

/** Push a new spec snapshot into the history stack. */
export type SpecPush = (spec: Spec, label: string, group?: string) => void;
