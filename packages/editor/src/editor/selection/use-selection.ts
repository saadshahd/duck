import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveHit, isFromShadowDom, type Hit } from "../fiber/index.js";
import type { EditorEvent } from "../machine/index.js";

// --- Hit → machine event mapping ---

export const hoverEvent = (hit: Hit | null): EditorEvent =>
  hit ? { type: "HOVER", elementId: hit.elementId } : { type: "UNHOVER" };

export const selectEvent = (hit: Hit | null, multi: boolean): EditorEvent =>
  hit
    ? { type: multi ? "MULTI_SELECT" : "SELECT", elementId: hit.elementId }
    : { type: "DESELECT" };

// --- Hook ---

/** Wire pointer events (mousemove, click) to the editor machine. */
export function useEditorSelection(
  registry: FiberRegistry | null,
  send: (event: EditorEvent) => void,
): void {
  useEffect(
    function wirePointerEvents() {
      if (!registry) return;
      let raf = 0;

      const onMove = (e: MouseEvent) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() =>
          send(hoverEvent(resolveHit(registry, e.clientX, e.clientY))),
        );
      };

      const onClick = (e: MouseEvent) => {
        if (isFromShadowDom(e)) return;
        send(
          selectEvent(resolveHit(registry, e.clientX, e.clientY), e.shiftKey),
        );
      };

      document.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("click", onClick);

      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("click", onClick);
      };
    },
    [registry, send],
  );
}
