import { SegmentGroup } from "@ark-ui/react/segment-group";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass, resolveValueMode } from "../field-shell.js";
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
  const mode = resolveValueMode(value, presets);
  // SegmentGroup value: stored string when a preset is selected; empty string
  // for unset (Ark treats "" as "no selection" in controlled mode, whereas
  // undefined makes Ark ignore the prop and retain internal state).
  const groupValue = mode.mode === "preset" ? mode.key : "";
  const isUnset = mode.mode !== "preset";

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel text={selectField.label ?? label} readOnly={readOnly} />
      <SegmentGroup.Root
        className="swatch-root"
        data-role="swatch"
        value={groupValue}
        disabled={readOnly}
        onValueChange={(e) => {
          // e.value is string | null (Ark type); null means deselect — ignore it
          // (swatches are single-select and always-set once chosen).
          if (e.value !== null) {
            onChange(e.value);
          }
        }}
      >
        {/* Unset sentinel — always rendered so the user can click to clear a
            selection. Shows a hatched diagonal pattern (never looks like any
            real color). Selected-state ring applied when current value is unset. */}
        <span
          className={`swatch-sentinel${isUnset ? " swatch-sentinel--selected" : ""}`}
          data-role="swatch-sentinel"
          data-selected={isUnset ? "" : undefined}
          aria-label={
            isUnset ? "No color selected (current)" : "Clear color selection"
          }
          title={isUnset ? "No color set" : "Clear color"}
          onClick={() => {
            if (!readOnly) onChange(undefined);
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
      </SegmentGroup.Root>
    </div>
  );
}) as ControlRenderer;
