import type { Spec, UIElement } from "@json-render/core";

type FullNode = {
  readonly id: string;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: OutlineNode[];
};

type SummaryNode = {
  readonly id: string;
  readonly type: string;
  readonly childCount: number;
};

export type OutlineNode = FullNode | SummaryNode;

const walk = (
  spec: Spec,
  id: string,
  depth: number,
  maxDepth: number,
): OutlineNode => {
  const el = spec.elements[id];
  if (!el) return { id, type: "unknown", childCount: 0 };
  const children = el.children ?? [];
  if (depth >= maxDepth)
    return { id, type: el.type, childCount: children.length };
  return {
    id,
    type: el.type,
    props: el.props as Record<string, unknown>,
    children: children.map((c) => walk(spec, c, depth + 1, maxDepth)),
  };
};

/** Depth-limited tree view. Above maxDepth: full node with props and children.
 *  At or below maxDepth: summary with childCount only. */
export const outlineTree = (spec: Spec, maxDepth = 2): OutlineNode =>
  walk(spec, spec.root, 0, maxDepth);
