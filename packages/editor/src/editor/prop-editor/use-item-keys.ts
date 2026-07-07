import { useRef } from "react";
import { createKeyStore, keyFor, carry, type KeyStore } from "./item-keys.js";
import type { ArrayItem } from "./array-items.js";

/** Control-owned identity for array rows. `keyFor` returns a stable key that
 *  follows an item through reorder and removal; `carry` hands that key to the
 *  fresh object a nested edit spreads. See item-keys.ts for the invariant. */
export function useItemKeys() {
  const ref = useRef<KeyStore | null>(null);
  if (!ref.current) ref.current = createKeyStore();
  const store = ref.current;
  return {
    keyFor: (item: ArrayItem): string => keyFor(store, item),
    carry: (next: ArrayItem, prev: ArrayItem): ArrayItem => {
      carry(store, next, prev);
      return next;
    },
  };
}
