import { useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { ComponentData } from "@puckeditor/core";
import { useShadowSheet } from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import { PuckFields } from "./puck-fields.js";
import type { ResolvedFields } from "./find-editable-prop.js";
import { useOnClickOutside } from "../overlay/index.js";
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
  component: ComponentData;
  fields: ResolvedFields;
  onPropChange: (propKey: string, value: unknown) => void;
  onClose: () => void;
};

/**
 * Floating popover for editing all props of a selected component.
 * Positioned via @floating-ui, styled via prop-editor.css.
 */
export function PropPopover({
  registry,
  component,
  fields,
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

  const elementId = (component.props as { id?: string }).id ?? "";

  useEffect(
    function trackElement() {
      refs.setPositionReference({
        getBoundingClientRect: () =>
          registry.get(elementId)?.getBoundingClientRect() ?? ZERO_RECT,
      });
    },
    [refs, registry, elementId],
  );

  useOnClickOutside(refs.floating, onClose);

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

  const readOnlyFields = component.readOnly as
    | Partial<Record<string, boolean>>
    | undefined;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="prop-popover"
      data-role="prop-popover"
    >
      <PuckFields
        fields={fields}
        values={component.props as Record<string, unknown>}
        readOnlyFields={readOnlyFields}
        onChange={onPropChange}
      />
    </div>
  );
}
