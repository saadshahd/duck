import type { ComponentData } from "@puckeditor/core";
import { mapComponent } from "@duckeditor/spec";
import type { RemintIds } from "./types.js";

/**
 * Walk a merged component tree and replace every node ID that is not in
 * `preservedIds` with a fresh UUID. Call this after `merge()` to guarantee
 * document-level ID uniqueness before inserting the result.
 *
 * The root's ID is always in `preservedIds` (it came from the selection),
 * so it is never reminted.
 */
export const remintIds: RemintIds = (root, preservedIds) => {
  const walk = (node: ComponentData): ComponentData => {
    const id = preservedIds.has(String(node.props.id))
      ? String(node.props.id)
      : crypto.randomUUID();
    const mapped = mapComponent(node, (child) => [walk(child)]);
    return { ...mapped, props: { ...mapped.props, id } };
  };

  return mapComponent(root, (child) => [walk(child)]);
};
