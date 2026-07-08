import { Fragment } from "react";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import {
  useShadowSheet,
  useOnClickOutside,
  useAnchor,
  useMenuKeyboard,
} from "../overlay/index.js";
import type { FiberRegistry } from "../fiber/index.js";
import type { MorphEntry } from "./use-morph.js";
import css from "./morph.css?inline";

const MIDDLEWARE = [offset(8), flip(), shift({ padding: 8 })];

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
  registry: FiberRegistry;
  elementId: string;
};

export function MorphPicker({
  entries,
  onHover,
  onCommit,
  onClose,
  commitError,
  registry,
  elementId,
}: Props) {
  useShadowSheet(css);

  // Anchor beside the morphed element (right-start, flipping to left-start when
  // the right edge lacks room) so the picker never drops over the element it is
  // transforming — the see-while-you-edit loop stays unbroken. Not the ♦ button,
  // which sits above the element and would drop the menu straight onto it.
  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: MIDDLEWARE,
  });

  useAnchor(refs, registry, { kind: "element", elementId });

  useOnClickOutside(refs.floating, onClose);

  // Keyboard-only highlight — mouse hover is handled by CSS :hover.
  const { activeIndex: keyboardActive } = useMenuKeyboard({
    count: entries.length,
    onSelect: onCommit,
    onClose,
    onHover,
  });

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
