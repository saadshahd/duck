import { useCallback, useState } from "react";
import { usePrevious } from "../overlay/index.js";

const EMPTY: ReadonlySet<string> = new Set();

const toggleIn = (
  s: ReadonlySet<string>,
  path: string,
): ReadonlySet<string> => {
  const next = new Set(s);
  next.has(path) ? next.delete(path) : next.add(path);
  return next;
};

/** Open-path set for nested disclosures, keyed by selected element id. Resets to
 *  empty when the selection re-targets (a different element has different fields);
 *  persists across re-renders of the same element so live commits never collapse
 *  the panel being edited. */
export function useDisclosureState(elementId: string) {
  const [open, setOpen] = useState<ReadonlySet<string>>(EMPTY);
  const prev = usePrevious(elementId);
  if (prev !== elementId && open !== EMPTY) setOpen(EMPTY);
  const toggle = useCallback(
    (path: string) => setOpen((s) => toggleIn(s, path)),
    [],
  );
  return { isOpen: (p: string) => open.has(p), toggle };
}
