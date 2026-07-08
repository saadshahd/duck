import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../overlay/index.js";
import { FieldLabel, fieldClass } from "./field-shell.js";
import { toDisplayLabel } from "./field-label.js";
import { radioLayout } from "./radio-layout.js";
import type { FieldProps } from "./puck-fields.js";
import css from "./radio.css?inline";

/**
 * Native `radio` field. The inputs stay real `<input type="radio">` so arrow-key
 * navigation, focus, and the checked semantics come from the platform — the CSS
 * only restyles them. The option set's shape (count + label length) picks a
 * horizontal segmented row or a vertical stacked group via `radioLayout`; both
 * render the same native inputs, so the choice is presentation only.
 *
 * Puck has no boolean field type — a boolean arrives here as a 2-option radio,
 * which `radioLayout` renders segmented.
 */
export const RadioInput = ({
  label,
  field,
  value,
  onChange,
  readOnly,
  path,
}: FieldProps<Extract<Field, { type: "radio" }>, unknown>) => {
  useShadowSheet(css);
  const layout = radioLayout(field.options);
  // One radio group name per rendered field. Path is unique across nesting;
  // fall back to the label at the top level where path may be the bare key.
  const groupName = `radio-${path ?? label}`;
  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, field.label)}
        readOnly={readOnly}
      />
      <div className="radio-group" data-role="radio-group" data-layout={layout}>
        {field.options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={String(opt.value)}
              className="radio-option"
              data-role="radio-option"
              data-value={String(opt.value)}
              data-checked={checked ? "" : undefined}
            >
              <input
                type="radio"
                name={groupName}
                value={String(opt.value)}
                checked={checked}
                disabled={readOnly}
                onChange={() => onChange(opt.value)}
              />
              <span className="radio-dot" aria-hidden />
              <span className="radio-option-label">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
