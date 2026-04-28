import type { ComponentData } from "@puckeditor/core";
import { slotKeysOf } from "@duck/spec";

/**
 * Walk a merged component tree and replace every node ID that is not in
 * `preservedIds` with a fresh UUID. Call this after `merge()` to guarantee
 * document-level ID uniqueness before inserting the result.
 *
 * The root's ID is always in `preservedIds` (it came from the selection),
 * so it is never reminted.
 */
export function remintIds(
  root: ComponentData,
  preservedIds: Set<string>,
): ComponentData {
  const walk = (node: ComponentData): ComponentData => {
    const id = preservedIds.has(String(node.props.id))
      ? String(node.props.id)
      : crypto.randomUUID();
    const slotUpdates = Object.fromEntries(
      slotKeysOf(node).map((key) => [
        key,
        (node.props[key] as ComponentData[]).map(walk),
      ]),
    );
    return { ...node, props: { ...node.props, ...slotUpdates, id } };
  };

  const slotUpdates = Object.fromEntries(
    slotKeysOf(root).map((key) => [
      key,
      (root.props[key] as ComponentData[]).map(walk),
    ]),
  );
  return { ...root, props: { ...root.props, ...slotUpdates } };
}
