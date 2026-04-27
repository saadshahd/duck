import { useEffect, useRef, useState } from "react";
import type { Config, Data } from "@puckeditor/core";
import { resolveAllData } from "@puckeditor/core";

export type ResolvedDataState = { data: Data; pending: boolean };

export function useResolvedData(data: Data, config: Config): ResolvedDataState {
  const [resolved, setResolved] = useState<Data>(data);
  const [pending, setPending] = useState(false);
  const latestInputRef = useRef(data);

  useEffect(
    function resolve() {
      latestInputRef.current = data;
      let cancelled = false;
      setPending(true);
      Promise.resolve(resolveAllData(data, config))
        .then((next) => {
          if (cancelled) return;
          if (latestInputRef.current !== data) return;
          setResolved(next as Data);
          setPending(false);
        })
        .catch(() => {
          if (!cancelled) setPending(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [data, config],
  );

  return { data: resolved, pending };
}
