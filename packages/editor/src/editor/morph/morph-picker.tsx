import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { Menu, MenuItem } from "react-aria-components";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import type { SectionPattern } from "@duck/patterns";
import css from "./morph.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

const EMPTY_RECT = {
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

type Props = {
  patterns: SectionPattern[];
  onHover: (index: number) => void;
  onCommit: (index: number) => void;
  onClose: () => void;
  commitError: string | null;
  anchorRef: RefObject<HTMLElement | null>;
};

export function MorphPicker({
  patterns,
  onHover,
  onCommit,
  onClose,
  commitError,
  anchorRef,
}: Props) {
  useShadowSheet(css);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
  });

  useEffect(
    function anchorToButton() {
      refs.setPositionReference({
        getBoundingClientRect: () =>
          anchorRef.current?.getBoundingClientRect() ?? EMPTY_RECT,
      });
    },
    [refs, anchorRef],
  );

  useOnClickOutside(refs.floating, onClose);

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      data-role="morph-picker"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <Menu
        aria-label="Structural alternatives"
        autoFocus
        className="morph-picker"
        onAction={(key) => onCommit(Number(key))}
      >
        {patterns.map((pattern, i) => (
          <MenuItem
            key={pattern.name}
            id={String(i)}
            className="morph-picker-item"
            onFocus={() => {
              setFocusedIndex(i);
              onHover(i);
            }}
            onHoverChange={(hovered) => {
              if (hovered) {
                setFocusedIndex(i);
                onHover(i);
              }
            }}
          >
            <span className="morph-picker-name">{pattern.name}</span>
            <span className="morph-picker-desc">{pattern.description}</span>
            {commitError && i === focusedIndex && (
              <span className="morph-picker-error">{commitError}</span>
            )}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
