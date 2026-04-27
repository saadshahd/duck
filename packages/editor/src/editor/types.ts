import type { Data } from "@puckeditor/core";

/** Push a new data snapshot into the history stack. */
export type DataPush = (data: Data, label: string, group?: string) => void;
