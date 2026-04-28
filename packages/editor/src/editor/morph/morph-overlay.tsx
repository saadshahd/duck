import { useEffect, useRef } from "react";
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
  const rect = fiberRegistry.get(elementId)?.getBoundingClientRect();
  const data = { content: [element], zones: {} };
  const originalRef = useRef<Element | null>(null);

  useEffect(
    function hideOriginal() {
      const el = fiberRegistry.get(elementId) as HTMLElement | null;
      if (!el) return;
      originalRef.current = el;
      el.style.visibility = "hidden";
      return () => {
        (originalRef.current as HTMLElement | null)?.style.setProperty(
          "visibility",
          "",
        );
      };
    },
    [fiberRegistry, elementId],
  );

  if (!rect) return null;

  const el = fiberRegistry.get(elementId) as HTMLElement | null;
  const computed = el ? getComputedStyle(el) : null;
  const inheritedFont = computed
    ? {
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        color: computed.color,
      }
    : {};

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        pointerEvents: "none",
        zIndex: 1,
        ...inheritedFont,
      }}
      data-role="morph-overlay"
    >
      <Render config={config} data={data} />
    </div>,
    document.body,
  );
}
