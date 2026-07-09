import { useEffect, useRef } from "react";
import type { Data } from "@puckeditor/core";
import { normalizeData } from "@duckeditor/spec";
import { deepEqual } from "fast-equals";

/** Reset history to the external `data` prop whenever the host supplies a new
 *  prop identity that differs in value from the current document. The editor is
 *  a controlled surface: a host-driven data change re-seeds history, but an
 *  identical value (or an echo of our own change) is ignored so local edits and
 *  undo history survive re-renders. */
export const useExternalDataSync = ({
  data,
  currentData,
  reset,
}: {
  data: Partial<Data>;
  currentData: Data;
  reset: (data: Data) => void;
}) => {
  const lastSeenPropRef = useRef(data);

  useEffect(() => {
    if (data === lastSeenPropRef.current) return;
    const next = normalizeData(data);
    lastSeenPropRef.current = data;
    if (deepEqual(next, currentData)) return;
    reset(next);
  }, [data, currentData, reset]);
};
