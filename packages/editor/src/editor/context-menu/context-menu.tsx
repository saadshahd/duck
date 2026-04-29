import { useContext, useEffect } from "react";
import { Menu, MenuItem, Section, Separator } from "react-aria-components";
import { useFloating, flip, shift } from "@floating-ui/react";
import type { Data } from "@puckeditor/core";
import { findById } from "@duck/spec";
import {
  useShadowSheet,
  useOnClickOutside,
  PortalContext,
} from "../overlay/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { ClipboardActions } from "../types.js";
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
  const portalContainer = useContext(PortalContext);

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

  const clipboardActionMap = new Map(
    CLIPBOARD_ITEMS.map((item) => [item.action, item]),
  );

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      data-role="context-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <Menu
        aria-label="Context menu"
        autoFocus
        className="context-menu"
        onAction={(key) => {
          const id = String(key);
          if (elementIds.includes(id)) {
            send({ type: "SELECT", elementId: id });
          } else {
            const item = clipboardActionMap.get(id as keyof ClipboardActions);
            if (item && !(item.needsSelection && !lastSelectedId)) {
              clipboard[item.action]();
            }
          }
          onClose();
        }}
      >
        <Section>
          {elementIds.map((id) => {
            const component = findById(data, id);
            if (!component) return null;
            return (
              <MenuItem
                key={id}
                id={id}
                className="context-menu-item"
                onFocus={() => onHighlight(id)}
                onHoverChange={(hovered) => onHighlight(hovered ? id : null)}
              >
                <span className="context-menu-item-type">{component.type}</span>
                <span className="context-menu-item-id">{id}</span>
              </MenuItem>
            );
          })}
        </Section>
        <Separator className="context-menu-divider" />
        <Section>
          {CLIPBOARD_ITEMS.map(
            ({ label, shortcut, action, needsSelection }) => (
              <MenuItem
                key={action}
                id={action}
                className="context-menu-action"
                isDisabled={needsSelection && !lastSelectedId}
              >
                <span>{label}</span>
                <span className="context-menu-shortcut">{shortcut}</span>
              </MenuItem>
            ),
          )}
        </Section>
      </Menu>
    </div>
  );
}
