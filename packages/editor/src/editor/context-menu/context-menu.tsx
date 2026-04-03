import { useEffect } from "react";
import { useFloating, flip, shift } from "@floating-ui/react";
import type { Spec } from "@json-render/core";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import type { EditorEvent } from "../machine/index.js";
import { useMenuKeyboard } from "./use-menu-keyboard.js";
import css from "./context-menu.css?inline";

const MIDDLEWARE = [flip(), shift({ padding: 8 })];

const isEntering = (e: React.MouseEvent) => {
  const related = e.relatedTarget as Node | null;
  return !related || !e.currentTarget.contains(related);
};

type ContextMenuProps = {
  x: number;
  y: number;
  elementIds: string[];
  spec: Spec;
  send: (event: EditorEvent) => void;
  onHighlight: (elementId: string | null) => void;
  onClose: () => void;
};

export function ContextMenu({
  x,
  y,
  elementIds,
  spec,
  send,
  onHighlight,
  onClose,
}: ContextMenuProps) {
  useShadowSheet(css);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
  });

  useEffect(
    function positionAtCursor() {
      refs.setPositionReference({
        getBoundingClientRect: () => ({
          x,
          y,
          top: y,
          left: x,
          bottom: y,
          right: x,
          width: 0,
          height: 0,
          toJSON: () => ({}),
        }),
      });
    },
    [refs, x, y],
  );

  useOnClickOutside(refs.floating, onClose);

  const select = (i: number) => {
    send({ type: "SELECT", elementId: elementIds[i] });
    onClose();
  };

  const { activeIndex, setActiveIndex } = useMenuKeyboard({
    count: elementIds.length,
    onSelect: select,
    onClose,
  });

  useEffect(
    function syncHighlight() {
      onHighlight(activeIndex >= 0 ? elementIds[activeIndex] : null);
    },
    [activeIndex, elementIds, onHighlight],
  );

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="context-menu"
      role="menu"
      data-role="context-menu"
      onClick={(e) => e.stopPropagation()}
    >
      {elementIds.map((id, i) => {
        const element = spec.elements[id];
        if (!element) return null;
        return (
          <div
            key={id}
            className="context-menu-item"
            role="menuitem"
            data-active={i === activeIndex ? "" : undefined}
            onMouseOver={(e) => {
              if (isEntering(e)) setActiveIndex(i);
            }}
            onMouseOut={(e) => {
              if (isEntering(e)) setActiveIndex(-1);
            }}
            onClick={() => select(i)}
          >
            <span className="context-menu-item-type">{element.type}</span>
            <span className="context-menu-item-id">{id}</span>
          </div>
        );
      })}
    </div>
  );
}
