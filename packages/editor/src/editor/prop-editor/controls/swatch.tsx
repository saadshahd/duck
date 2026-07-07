import { SegmentGroup } from "@ark-ui/react/segment-group";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass, resolveValueMode } from "../field-shell.js";
import { toDisplayLabel } from "../field-label.js";
import { useDebouncedText } from "../use-debounced-text.js";
import { isCssColor, toPickerHex } from "./color-parse.js";
import type { ControlRenderer, FieldProps } from "./index.js";
import css from "./swatch.css?inline";

type SelectField = Extract<Field, { type: "select" }>;

// Cast to the base ControlRenderer at the export: the registry is
// Record<string, ControlRenderer>, but resolveRenderer only dispatches here for
// select fields tagged metadata.control="swatch", so the field is a SelectField.
export const Swatch = (({
  label,
  field,
  value,
  onChange,
  readOnly,
}: FieldProps<Field, unknown>) => {
  useShadowSheet(css);

  // Dispatch (resolveRenderer) guarantees this renderer is only reached for a
  // select field, so the narrowing cast is safe.
  const selectField = field as SelectField;

  const presets = selectField.options.map((o) => String(o.value));
  const storedStr = String(value ?? "");
  const mode = resolveValueMode(value, presets);
  // SegmentGroup value: stored string when a preset is selected; empty string
  // for literal or unset (Ark treats "" as "no selection" in controlled mode,
  // whereas undefined makes Ark ignore the prop and retain internal state).
  const groupValue = mode.mode === "preset" ? mode.key : "";
  // Sentinel is selected ONLY when the value is truly absent — an off-palette
  // literal is a set value and must never read as "no color" (honesty contract).
  const isUnset = mode.mode === "unset";

  // Free-form entry — the `continuous` commit path (shared 300ms debounce,
  // Enter/blur flush). Only a parseable CSS color commits; invalid text stays
  // an uncommitted draft and reverts to the stored value on flush. The stored
  // literal is exactly what was typed — no normalization.
  const commitColor = (text: string) => {
    if (isCssColor(text)) onChange(text);
  };
  const { draft, handleChange, handleBlur, handleKeyDown, cancel } =
    useDebouncedText(storedStr, commitColor);
  const isDraftInvalid = draft !== "" && !isCssColor(draft);
  const pickerHex = toPickerHex(draft) ?? "#000000";

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, selectField.label)}
        readOnly={readOnly}
      />
      <SegmentGroup.Root
        className="swatch-root"
        data-role="swatch"
        value={groupValue}
        disabled={readOnly}
        onValueChange={(e) => {
          // e.value is string | null (Ark type); null means deselect — ignore it
          // (swatches are single-select and always-set once chosen).
          if (e.value !== null) {
            cancel();
            onChange(e.value);
          }
        }}
      >
        {/* Unset sentinel — always rendered so the user can click to clear a
            selection. Shows a hatched diagonal pattern (never looks like any
            real color). Selected-state ring applied only when truly unset. */}
        <span
          className={`swatch-sentinel${isUnset ? " swatch-sentinel--selected" : ""}`}
          data-role="swatch-sentinel"
          data-selected={isUnset ? "" : undefined}
          aria-label={
            isUnset ? "No color selected (current)" : "Clear color selection"
          }
          title={isUnset ? "No color set" : "Clear color"}
          onClick={() => {
            if (!readOnly) {
              cancel();
              onChange(undefined);
            }
          }}
        />
        {selectField.options.map((opt) => {
          const hex = String(opt.value);
          return (
            <SegmentGroup.Item
              key={hex}
              value={hex}
              className="swatch-item"
              data-role="swatch-item"
              data-value={hex}
            >
              <SegmentGroup.ItemText>
                <span
                  className="swatch-color"
                  style={{ background: hex }}
                  aria-label={opt.label ?? hex}
                />
              </SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          );
        })}
        {/* Custom chip — rendered ONLY while the stored value is an off-palette
            literal. It shows the actual stored color, selected, so an agent- or
            input-set color is visible truth, never coerced to a palette chip or
            the unset sentinel. Display-only: the current value needs no click. */}
        {mode.mode === "literal" && (
          <span
            className="swatch-custom"
            data-role="swatch-custom"
            data-selected=""
            style={{ background: mode.value }}
            title={mode.value}
            aria-label={`Custom color ${mode.value} (current)`}
          />
        )}
      </SegmentGroup.Root>
      {/* Free-form row — always on (the dimension model applied to color): a
          native picker well seeding #rrggbb literals, and a text input whose
          typed literal is the source of truth. */}
      <div
        className="swatch-input-row"
        data-disabled={readOnly ? "" : undefined}
      >
        <span className="swatch-well" data-role="swatch-well">
          <input
            type="color"
            aria-label="Pick custom color"
            value={pickerHex}
            disabled={readOnly}
            onChange={handleChange}
          />
          <span
            className="swatch-well-fill"
            style={{
              background:
                draft !== "" && !isDraftInvalid ? draft : "transparent",
            }}
            aria-hidden
          />
        </span>
        <input
          className="swatch-input"
          data-role="swatch-input"
          data-invalid={isDraftInvalid ? "" : undefined}
          type="text"
          spellCheck={false}
          placeholder="Custom color"
          aria-label="Custom color value"
          aria-invalid={isDraftInvalid || undefined}
          value={draft}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}) as ControlRenderer;
