import { useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { Spec } from "@json-render/core";
import type { ZodTypeAny } from "zod";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { ZodFields } from "./zod-fields.js";
import css from "./prop-editor.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

const ZERO_RECT: DOMRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
};

type PropPopoverProps = {
  registry: FiberRegistry;
  spec: Spec;
  elementId: string;
  schema: ZodTypeAny;
  onPropChange: (propKey: string, value: unknown) => void;
  onClose: () => void;
};

/**
 * Schema-driven floating popover for editing all props of a selected element.
 * Positioned via @floating-ui, styled via overlay.css.
 */
export function PropPopover({
  registry,
  spec,
  elementId,
  schema,
  onPropChange,
  onClose,
}: PropPopoverProps) {
  useShadowSheet(css);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
  });

  useEffect(
    function trackElement() {
      refs.setPositionReference({
        getBoundingClientRect: () =>
          registry.get(elementId)?.getBoundingClientRect() ?? ZERO_RECT,
      });
    },
    [refs, registry, elementId],
  );

  // Close on Escape
  useEffect(
    function handleEscape() {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    },
    [onClose],
  );

  const element = spec.elements[elementId];
  if (!element) return null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="prop-popover"
      data-role="prop-popover"
    >
      <ZodFields
        schema={schema}
        values={element.props}
        onChange={onPropChange}
      />
    </div>
  );
}
