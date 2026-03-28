import { useEffect, useState } from "react";
import type { FiberRegistry } from "./fiber-registry.js";

// --- Types ---

type Hit = { elementId: string; rect: DOMRect };

export type EditorSelection =
  | { tag: "idle" }
  | { tag: "hovering"; elementId: string; rect: DOMRect }
  | { tag: "selected"; elementId: string; rect: DOMRect };

// --- Pure state transitions ---

export function transitionHover(
  prev: EditorSelection,
  hit: Hit | null,
): EditorSelection {
  if (!hit) return prev.tag === "selected" ? prev : { tag: "idle" };
  if (prev.tag === "hovering" && prev.elementId === hit.elementId) return prev;
  if (prev.tag === "selected") return prev;
  return { tag: "hovering", ...hit };
}

export function transitionSelect(
  _prev: EditorSelection,
  hit: Hit | null,
): EditorSelection {
  if (!hit) return { tag: "idle" };
  return { tag: "selected", ...hit };
}

// --- Hit resolution (DOM → element ID → rect) ---

function resolveHit(registry: FiberRegistry, x: number, y: number): Hit | null {
  const target = document.elementFromPoint(x, y);
  if (!target) return null;
  const id = registry.getNodeId(target);
  if (!id) return null;
  const el = registry.get(id);
  if (!el) return null;
  return { elementId: id, rect: el.getBoundingClientRect() };
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
      const hit = resolveHit(registry, e.clientX, e.clientY);
      setState((prev) => transitionSelect(prev, hit));
    };

    const onScroll = () => {
      setState((prev) => {
        if (prev.tag === "idle") return prev;
        const el = registry.get(prev.elementId);
        if (!el) return { tag: "idle" };
        return { ...prev, rect: el.getBoundingClientRect() };
      });
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [registry]);

  return state;
}
