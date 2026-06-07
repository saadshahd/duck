import { SegmentGroup } from "@ark-ui/react/segment-group";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass } from "../field-shell.js";
import { selectDisplay } from "../puck-fields.js";
import type { ControlRenderer } from "./index.js";
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

function SegmentedControlInner({
  label,
  field,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  useShadowSheet(css);

  const selectField = field as SelectField;
  const { isUnset, display } = selectDisplay(value, selectField.options);
  // SegmentGroup requires a string value prop; undefined = no selection (honest unset).
  const groupValue = isUnset ? undefined : display;

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel text={selectField.label ?? label} readOnly={readOnly} />
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
}

// Cast to the base ControlRenderer type so the registry (Record<string, ControlRenderer>)
// accepts it. The runtime dispatch in resolveRenderer only calls this for select fields
// annotated with metadata.control = "segmented", so the narrowed field cast is safe.
export const SegmentedControl: ControlRenderer =
  SegmentedControlInner as ControlRenderer;
