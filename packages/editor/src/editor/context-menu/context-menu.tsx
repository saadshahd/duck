import { useEffect } from "react";
import { useFloating, flip, shift } from "@floating-ui/react";
import type { Data } from "@puckeditor/core";
import { findById } from "@duck/spec";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { ClipboardActions } from "../types.js";
import { useMenuKeyboard } from "./use-menu-keyboard.js";
import css from "./context-menu.css?inline";

const MIDDLEWARE = [flip(), shift({ padding: 8 })];

const isMac = navigator.platform.startsWith("Mac");
const MOD = isMac ? "⌘" : "Ctrl+";

const CLIPBOARD_ITEMS: {
  label: string;
  shortcut: string;
  action: keyof ClipboardActions;
  needsSelection: boolean;
}[] = [
  {
    label: "Copy",
    shortcut: `${MOD}C`,
    action: "onCopy",
    needsSelection: true,
  },
  { label: "Cut", shortcut: `${MOD}X`, action: "onCut", needsSelection: true },
  {
    label: "Paste",
    shortcut: `${MOD}V`,
    action: "onPaste",
    needsSelection: false,
  },
  {
    label: "Duplicate",
    shortcut: `${MOD}D`,
    action: "onDuplicate",
    needsSelection: true,
  },
];

const isEntering = (e: React.MouseEvent) => {
  const related = e.relatedTarget as Node | null;
  return !related || !e.currentTarget.contains(related);
};

type ContextMenuProps = {
  x: number;
  y: number;
  elementIds: string[];
  data: Data;
  lastSelectedId: string | null;
  send: (event: EditorEvent) => void;
  clipboard: ClipboardActions;
  onHighlight: (elementId: string | null) => void;
  onClose: () => void;
};

export function ContextMenu({
  x,
  y,
  elementIds,
  data,
  lastSelectedId,
  send,
  clipboard,
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
        const component = findById(data, id);
        if (!component) return null;
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
            <span className="context-menu-item-type">{component.type}</span>
            <span className="context-menu-item-id">{id}</span>
          </div>
        );
      })}
      <div className="context-menu-divider" />
      {CLIPBOARD_ITEMS.map(({ label, shortcut, action, needsSelection }) => {
        const disabled = needsSelection && !lastSelectedId;
        return (
          <div
            key={action}
            className="context-menu-action"
            role="menuitem"
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (disabled) return;
              clipboard[action]();
              onClose();
            }}
          >
            <span>{label}</span>
            <span className="context-menu-shortcut">{shortcut}</span>
          </div>
        );
      })}
    </div>
  );
}
