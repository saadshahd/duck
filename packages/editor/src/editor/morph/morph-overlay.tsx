import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Config, ComponentData } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";

type Props = {
  config: Config;
  element: ComponentData;
  fiberRegistry: FiberRegistry;
  elementId: string;
};

export function MorphOverlay({
  config,
  element,
  fiberRegistry,
  elementId,
}: Props) {
  const el = fiberRegistry.get(elementId) as HTMLElement | null;
  const parent = el?.parentElement ?? null;

  useEffect(
    function makeParentPositioned() {
      if (!parent) return;
      const prev = parent.style.position;
      if (!prev || prev === "static") parent.style.position = "relative";
      return () => {
        parent.style.position = prev;
      };
    },
    [parent],
  );

  useEffect(
    function hideOriginal() {
      if (!el) return;
      el.style.visibility = "hidden";
      return () => {
        el.style.visibility = "";
      };
    },
    [el],
  );

  if (!el || !parent) return null;

  const elRect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const top = elRect.top - parentRect.top + parent.scrollTop;
  const left = elRect.left - parentRect.left + parent.scrollLeft;

  return createPortal(
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: el.offsetWidth,
        pointerEvents: "none",
        zIndex: 1,
      }}
      data-role="morph-overlay"
    >
      <Render config={config} data={{ content: [element], zones: {} }} />
    </div>,
    parent,
  );
}
