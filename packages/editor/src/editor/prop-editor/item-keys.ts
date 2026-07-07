/** Stable per-item keys for array rows, owned by the control (never the stored
 *  data). A key is minted lazily by object identity, so it travels with its
 *  item across reorder and removal; `carry` copies a key onto the fresh object a
 *  nested edit spreads, so disclosure open-state and input state stay with the
 *  item instead of pinning to a list index. Duplicate-content items get distinct
 *  keys — identity is by reference, never by value. */

export type KeyStore = { keys: WeakMap<object, string>; next: number };

export const createKeyStore = (): KeyStore => ({
  keys: new WeakMap(),
  next: 0,
});

export const keyFor = (store: KeyStore, item: object): string => {
  const existing = store.keys.get(item);
  if (existing) return existing;
  const key = `k${store.next++}`;
  store.keys.set(item, key);
  return key;
};

/** Copy `prev`'s key onto `next` — the object a nested edit produced by spreading
 *  `prev`. Keeps the row's identity across the edit. */
export const carry = (store: KeyStore, next: object, prev: object): void => {
  store.keys.set(next, keyFor(store, prev));
};
