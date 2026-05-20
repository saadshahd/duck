import { useEffect } from "react";
import type { FiberRegistry } from "../fiber/index.js";
import { resolveHit, isFromShadowDom, type Hit } from "../fiber/index.js";
import type { EditorEvent } from "../machine/index.js";

// --- Hit → machine event mapping ---

export const hoverEvent = (hit: Hit | null): EditorEvent => ({
  type: "HOVER",
  target: hit,
});

export const selectEvent = (hit: Hit | null): EditorEvent =>
  hit ? { type: "SELECT", target: hit } : { type: "DESELECT" };

// --- Hook ---

/** Wire pointer events (mousemove, click) to the editor machine.
 *  Shift-click is reserved (treated as a plain click). */
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
        send(selectEvent(resolveHit(registry, e.clientX, e.clientY)));
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
