import { Fragment, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { useShadowSheet, useOnClickOutside } from "../overlay/index.js";
import type { MorphEntry } from "./use-morph.js";
import css from "./morph.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];
const HANDLED = new Set(["Escape", "ArrowDown", "ArrowUp", "Enter"]);

const nameOf = (entry: MorphEntry) =>
  entry.kind === "pattern" ? entry.pattern.name : entry.variant.name;

const isFirstVariant = (entries: MorphEntry[], i: number) =>
  entries[i]?.kind === "variant" && entries[i - 1]?.kind !== "variant";

type Props = {
  entries: MorphEntry[];
  onHover: (index: number) => void;
  onCommit: (index: number) => void;
  onClose: () => void;
  commitError: string | null;
  anchorRef: RefObject<HTMLElement | null>;
};

export function MorphPicker({
  entries,
  onHover,
  onCommit,
  onClose,
  commitError,
  anchorRef,
}: Props) {
  useShadowSheet(css);
  // Keyboard-only state — mouse hover is handled by CSS :hover.
  const [keyboardActive, setKeyboardActive] = useState(-1);
  const keyboardActiveRef = useRef(-1);

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
    function wireKeyboard() {
      const count = entries.length;
      const onKeyDown = (e: KeyboardEvent) => {
        if (!HANDLED.has(e.key)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "ArrowDown") {
          const next =
            keyboardActiveRef.current < count - 1
              ? keyboardActiveRef.current + 1
              : 0;
          keyboardActiveRef.current = next;
          setKeyboardActive(next);
          onHover(next);
        } else if (e.key === "ArrowUp") {
          const next =
            keyboardActiveRef.current > 0
              ? keyboardActiveRef.current - 1
              : count - 1;
          keyboardActiveRef.current = next;
          setKeyboardActive(next);
          onHover(next);
        } else if (e.key === "Enter" && keyboardActiveRef.current >= 0) {
          onCommit(keyboardActiveRef.current);
        }
      };
      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    },
    [entries.length, onHover, onCommit, onClose],
  );

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="morph-picker"
      role="menu"
      data-role="morph-picker"
      onClick={(e) => e.stopPropagation()}
    >
      {entries.map((entry, i) => (
        <Fragment key={`${entry.kind}:${nameOf(entry)}:${i}`}>
          {isFirstVariant(entries, i) && (
            <div
              className="morph-picker-group-label"
              role="presentation"
              data-role="morph-picker-variants-label"
            >
              Quick variants
            </div>
          )}
          <div
            className="morph-picker-item"
            role="menuitem"
            data-kind={entry.kind}
            data-active={i === keyboardActive ? "" : undefined}
            onMouseOver={() => onHover(i)}
            onClick={() => onCommit(i)}
          >
            <span className="morph-picker-name">{nameOf(entry)}</span>
            {entry.kind === "pattern" && (
              <span className="morph-picker-desc">
                {entry.pattern.description}
              </span>
            )}
            {commitError && i === keyboardActive && (
              <span className="morph-picker-error">{commitError}</span>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
