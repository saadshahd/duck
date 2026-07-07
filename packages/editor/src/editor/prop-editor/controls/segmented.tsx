import { SegmentGroup } from "@ark-ui/react/segment-group";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass, resolveValueMode } from "../field-shell.js";
import { toDisplayLabel } from "../field-label.js";
import type { ControlRenderer, FieldProps } from "./index.js";
import css from "./segmented.css?inline";

type SelectField = Extract<Field, { type: "select" }>;

/** Map a string segment value back to the original option value, preserving
 *  the original type (string or number). On no-match — impossible in normal
 *  flow — returns the raw string so the caller is never silently dropped. */
const resolveOptionValue = (
  strValue: string,
  options: readonly { value: unknown }[],
): unknown => {
  const match = options.find((o) => String(o.value) === strValue);
  return match ? match.value : strValue;
};

// Cast to the base ControlRenderer at the export: the registry is
// Record<string, ControlRenderer>, but resolveRenderer only dispatches here for
// select fields tagged metadata.control="segmented", so the field is a SelectField.
export const Segmented = (({
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
      <FieldLabel
        text={toDisplayLabel(label, selectField.label)}
        readOnly={readOnly}
      />
      <SegmentGroup.Root
        className="segmented-root"
        data-role="segmented"
        value={groupValue}
        disabled={readOnly}
        onValueChange={(e) => {
          // e.value is string | null (Ark type); null means deselect — ignore it,
          // segmented controls are always-selected in our UX (not deselectable).
          if (e.value !== null) {
            onChange(resolveOptionValue(e.value, selectField.options));
          }
        }}
      >
        {selectField.options.map((opt) => {
          const strVal = String(opt.value);
          return (
            <SegmentGroup.Item
              key={strVal}
              value={strVal}
              className="segmented-item"
              data-role="segmented-item"
              data-value={strVal}
            >
              <SegmentGroup.ItemText>{opt.label}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          );
        })}
      </SegmentGroup.Root>
    </div>
  );
}) as ControlRenderer;
