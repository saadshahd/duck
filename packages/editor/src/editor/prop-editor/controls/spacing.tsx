import { useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass } from "../field-shell.js";
import { toDisplayLabel } from "../field-label.js";
import { FieldMetadata } from "../field-metadata.js";
import { useDebouncedText } from "../use-debounced-text.js";
import { parseLeadingNumber } from "./dimension-parse.js";
import {
  parseSides,
  formatSides,
  isLinked,
  type Sides,
} from "./spacing-parse.js";
import type { ControlRenderer, FieldProps } from "./index.js";
import css from "./spacing.css?inline";

type SelectField = Extract<Field, { type: "select" }>;

const LinkIcon = ({ linked }: { linked: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
    {linked ? (
      <path
        d="M9 12h6M8 8h-.5a4 4 0 0 0 0 8H8m8-8h.5a4 4 0 0 1 0 8H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ) : (
      <path
        d="M8 8h-.5a4 4 0 0 0 0 8H8m8-8h.5a4 4 0 0 1 0 8H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    )}
  </svg>
);

/**
 * Spacing control — a 1–4 token CSS shorthand editor. Linked (all sides equal):
 * preset chips + one number input with a unit badge. Unlinked (sides differ,
 * e.g. "0 auto"): a Figma-style cross of four per-side token inputs, the link
 * toggle at its center. Chips always emit a linked value; the link toggle splits
 * it for fine-tuning. Honest states: sentinel shows unset, a chip lights only on
 * an exact preset match, off-grid and per-side literals render verbatim (units
 * and keywords survive). Native inputs only — no controlled/uncontrolled traps.
 *
 * Dispatched by metadata.control="spacing" on a select field; the field's options
 * are the preset chips and metadata.unit is the appended unit.
 */
export const Spacing = (({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Field, unknown>) => {
  useShadowSheet(css);
  const selectField = field as SelectField;
  const unit = FieldMetadata.unit(selectField) ?? "";
  const storedStr = String(value ?? "");
  const sides = parseSides(storedStr);
  const unset = storedStr.trim() === "";
  const derivedLinked = isLinked(sides);

  // undefined = follow the stored value's shape; a boolean pins the user's choice.
  const [linkOverride, setLinkOverride] = useState<boolean | undefined>();
  const linked = unset ? true : (linkOverride ?? derivedLinked);

  // Linked single token → its leading number seeds the one number input.
  const linkedLeading = parseLeadingNumber(sides.top);
  const linkedInput = useDebouncedText(
    linkedLeading !== undefined ? String(linkedLeading) : "",
    (v) => onChange(v.trim() === "" ? undefined : `${v}${unit}`),
  );

  const commitSide = (side: keyof Sides, v: string) => {
    const next = formatSides({ ...sides, [side]: v.trim() });
    onChange(next === "" ? undefined : next);
  };
  const top = useDebouncedText(sides.top, (v) => commitSide("top", v));
  const right = useDebouncedText(sides.right, (v) => commitSide("right", v));
  const bottom = useDebouncedText(sides.bottom, (v) => commitSide("bottom", v));
  const left = useDebouncedText(sides.left, (v) => commitSide("left", v));
  const sideInputs = { top, right, bottom, left };

  const cancelDrafts = () => {
    linkedInput.cancel();
    top.cancel();
    right.cancel();
    bottom.cancel();
    left.cancel();
  };

  const pickChip = (v: string) => {
    if (readOnly) return;
    cancelDrafts();
    setLinkOverride(undefined);
    onChange(v);
  };
  const clear = () => {
    if (readOnly) return;
    cancelDrafts();
    setLinkOverride(undefined);
    onChange(undefined);
  };

  const toggleLink = (e: ReactMouseEvent) => {
    // Toggling swaps the layout, so this button unmounts itself on click. Without
    // stopping the event, the click reaches the sheet's click-outside handler with
    // a now-detached target and reads as a click outside → the sheet closes.
    e.stopPropagation();
    if (readOnly || unset) return;
    cancelDrafts();
    if (linked) {
      setLinkOverride(false);
      return;
    }
    // Re-link: collapse to the first set side, applied to all.
    const collapsed = sides.top || sides.right || sides.bottom || sides.left;
    setLinkOverride(undefined);
    onChange(collapsed || undefined);
  };

  const linkButton = (
    <button
      type="button"
      className="spacing-link"
      data-role="spacing-link"
      aria-pressed={linked}
      aria-label={
        linked
          ? "Sides linked — click to edit each side"
          : "Sides unlinked — click to link"
      }
      title={linked ? "Linked" : "Per-side"}
      disabled={readOnly || unset}
      onClick={toggleLink}
    >
      <LinkIcon linked={linked} />
    </button>
  );

  const sideInput = (side: keyof Sides) => {
    const s = sideInputs[side];
    return (
      <input
        type="text"
        className="spacing-side-input"
        data-role="spacing-side"
        data-side={side}
        value={s.draft}
        readOnly={readOnly}
        placeholder="—"
        aria-label={`${side} spacing`}
        onChange={s.handleChange}
        onBlur={s.handleBlur}
        onKeyDown={s.handleKeyDown}
      />
    );
  };

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, selectField.label)}
        readOnly={readOnly}
      />
      <div
        className="spacing-root"
        data-role="spacing"
        data-linked={linked ? "" : undefined}
      >
        {/* Preset chips + clear sentinel — always available; a chip re-links. */}
        <div className="spacing-chips">
          <span
            className={`spacing-sentinel${unset ? " spacing-sentinel--selected" : ""}`}
            data-role="spacing-sentinel"
            data-selected={unset ? "" : undefined}
            aria-label={unset ? "No value set (current)" : "Clear value"}
            title={unset ? "No value set" : "Clear value"}
            onClick={clear}
          />
          {selectField.options.map((opt) => {
            const strVal = String(opt.value);
            const checked = storedStr === strVal;
            return (
              <button
                key={strVal}
                type="button"
                className="spacing-chip"
                data-role="spacing-chip"
                data-value={strVal}
                data-checked={checked ? "" : undefined}
                disabled={readOnly}
                onClick={() => pickChip(strVal)}
              >
                {opt.label ?? strVal}
              </button>
            );
          })}
        </div>

        {linked ? (
          <div className="spacing-linked">
            <div className="spacing-input-control">
              <input
                type="number"
                className="spacing-input-field"
                data-role="spacing-input"
                value={linkedInput.draft}
                readOnly={readOnly}
                placeholder="—"
                aria-label={toDisplayLabel(label, selectField.label)}
                onChange={linkedInput.handleChange}
                onBlur={linkedInput.handleBlur}
                onKeyDown={linkedInput.handleKeyDown}
              />
              {unit && (
                <span className="spacing-unit-badge" aria-hidden>
                  {unit}
                </span>
              )}
            </div>
            {linkButton}
          </div>
        ) : (
          <div className="spacing-cross" data-role="spacing-cross">
            <div className="spacing-cross-row">{sideInput("top")}</div>
            <div className="spacing-cross-row spacing-cross-mid">
              {sideInput("left")}
              {linkButton}
              {sideInput("right")}
            </div>
            <div className="spacing-cross-row">{sideInput("bottom")}</div>
          </div>
        )}
      </div>
    </div>
  );
}) as ControlRenderer;
