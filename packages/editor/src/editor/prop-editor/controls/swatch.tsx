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
  // SegmentGroup requires a string value prop; undefined = no selection (honest unset).
  const groupValue = mode.mode === "preset" ? mode.key : undefined;

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
        {mode.mode !== "preset" && (
          <span
            className="swatch-sentinel"
            data-role="swatch-sentinel"
            aria-label="No color selected"
            title="No color set"
          >
            —
          </span>
        )}
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
