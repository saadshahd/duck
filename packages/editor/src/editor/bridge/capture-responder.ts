import { toPng } from "html-to-image";
import type { CaptureMode } from "@duckeditor/spec";

/** Excludes the shadow-DOM overlay host — captures should show only the rendered page. */
const isOverlayHost = (node: HTMLElement): boolean =>
  node.hasAttribute("data-duck-overlay");

export type CaptureTarget = {
  readonly element: HTMLElement;
  readonly width?: number;
  readonly height?: number;
};

/**
 * Resolves which DOM node and dimensions a capture mode targets. Pure — no
 * canvas/image work — so it's unit-testable without a real browser.
 *
 * `element` mode has no DOM id to resolve against (component ids live only
 * on the React fiber, never as a DOM attribute — see fiber/registry.ts) and
 * the bridge domain has no access to the fiber registry without threading
 * it through editor.tsx. Falls back to viewport until that seam exists.
 */
const resolvers: Record<
  CaptureMode["mode"],
  (root: HTMLElement) => CaptureTarget
> = {
  fullPage: (root) => ({ element: root }),
  viewport: (root) => ({
    element: root,
    width: window.innerWidth,
    height: window.innerHeight,
  }),
  element: (root) => resolvers.viewport(root),
};

export function resolveCaptureTarget(
  mode: CaptureMode,
  root: HTMLElement,
): CaptureTarget {
  return resolvers[mode.mode](root);
}

export function captureImage(
  mode: CaptureMode,
  root: HTMLElement = document.body,
): Promise<string> {
  const target = resolveCaptureTarget(mode, root);
  return toPng(target.element, {
    width: target.width,
    height: target.height,
    filter: (node) => !(node instanceof HTMLElement && isOverlayHost(node)),
  });
}
