import type { Data } from "@puckeditor/core";

export function normalizeData(data: Partial<Data> | undefined): Data {
  return {
    content: data?.content ?? [],
    root: data?.root ?? { props: {} },
    zones: data?.zones ?? {},
  } as Data;
}
