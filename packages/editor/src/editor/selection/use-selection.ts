import { useEffect, useState } from "react";
import type { FiberRegistry } from "../fiber/index.js";

// --- Types ---

type Hit = { elementId: string };

export type EditorSelection =
  | { tag: "idle" }
  | { tag: "hovering"; elementId: string }
  | { tag: "selected"; elementId: string };

// --- Pure state transitions ---

export function transitionHover(
  prev: EditorSelection,
  hit: Hit | null,
): EditorSelection {
  if (!hit) return prev.tag === "selected" ? prev : { tag: "idle" };
  if (prev.tag === "hovering" && prev.elementId === hit.elementId) return prev;
  if (prev.tag === "selected") return prev;
  return { tag: "hovering", elementId: hit.elementId };
}

export function transitionSelect(
  _prev: EditorSelection,
  hit: Hit | null,
): EditorSelection {
  if (!hit) return { tag: "idle" };
  return { tag: "selected", elementId: hit.elementId };
}

function isFromShadowDom(e: Event): boolean {
  const origin = e.composedPath()[0];
  return origin instanceof Node && origin.getRootNode() instanceof ShadowRoot;
}

// --- Hit resolution (DOM → element ID → rect) ---

function resolveHit(registry: FiberRegistry, x: number, y: number): Hit | null {
  const target = document.elementFromPoint(x, y);
  if (!target) return null;
  const id = registry.getNodeId(target);
  if (!id) return null;
  if (!registry.get(id)) return null;
  return { elementId: id };
}

// --- Hook ---

export function useEditorSelection(
  registry: FiberRegistry | null,
): EditorSelection {
  const [state, setState] = useState<EditorSelection>({ tag: "idle" });

  useEffect(() => {
    if (!registry) return;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const hit = resolveHit(registry, e.clientX, e.clientY);
        setState((prev) => transitionHover(prev, hit));
      });
    };

    const onClick = (e: MouseEvent) => {
      if (isFromShadowDom(e)) return;
      const hit = resolveHit(registry, e.clientX, e.clientY);
      setState((prev) => transitionSelect(prev, hit));
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick);
    };
  }, [registry]);

  return state;
}
