import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import type { SectionPattern } from "@duck/patterns";
import css from "./morph.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];
const HANDLED = new Set(["Escape", "ArrowDown", "ArrowUp", "Enter"]);

type Props = {
  patterns: SectionPattern[];
  activeIndex: number;
  onHover: (index: number) => void;
  onCommit: (index: number) => void;
  onClose: () => void;
  commitError: string | null;
  anchorRef: RefObject<HTMLElement | null>;
};

export function MorphPicker({
  patterns,
  activeIndex,
  onHover,
  onCommit,
  onClose,
  commitError,
  anchorRef,
}: Props) {
  useShadowSheet(css);
  const [localActive, setLocalActive] = useState(activeIndex);
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: MIDDLEWARE,
  });

  useEffect(
    function anchorToButton() {
      refs.setPositionReference({
        getBoundingClientRect: () =>
          anchorRef.current?.getBoundingClientRect() ?? {
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            width: 0,
            height: 0,
            toJSON: () => ({}),
          },
      });
    },
    [refs, anchorRef],
  );

  useOnClickOutside(refs.floating, onClose);

  useEffect(
    function syncLocalActive() {
      setLocalActive(activeIndex);
    },
    [activeIndex],
  );

  useEffect(
    function wireKeyboard() {
      const count = patterns.length;
      const onKeyDown = (e: KeyboardEvent) => {
        if (!HANDLED.has(e.key)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "ArrowDown") {
          const next = localActive < count - 1 ? localActive + 1 : 0;
          setLocalActive(next);
          onHover(next);
        } else if (e.key === "ArrowUp") {
          const next = localActive > 0 ? localActive - 1 : count - 1;
          setLocalActive(next);
          onHover(next);
        } else if (e.key === "Enter" && localActive >= 0) {
          onCommit(localActive);
        }
      };
      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    },
    [localActive, patterns.length, onHover, onCommit, onClose],
  );

  const isEntering = (e: React.MouseEvent) => {
    const related = e.relatedTarget as Node | null;
    return !related || !e.currentTarget.contains(related);
  };

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="morph-picker"
      role="menu"
      data-role="morph-picker"
      onClick={(e) => e.stopPropagation()}
    >
      {patterns.map((pattern, i) => (
        <div
          key={pattern.name}
          className="morph-picker-item"
          role="menuitem"
          data-active={i === localActive ? "" : undefined}
          onMouseOver={(e) => {
            if (isEntering(e)) {
              setLocalActive(i);
              onHover(i);
            }
          }}
          onMouseOut={(e) => {
            if (isEntering(e)) {
              setLocalActive(-1);
              onHover(-1);
            }
          }}
          onClick={() => onCommit(i)}
        >
          <span className="morph-picker-name">{pattern.name}</span>
          <span className="morph-picker-desc">{pattern.description}</span>
          {commitError && i === localActive && (
            <span className="morph-picker-error">{commitError}</span>
          )}
        </div>
      ))}
    </div>
  );
}
