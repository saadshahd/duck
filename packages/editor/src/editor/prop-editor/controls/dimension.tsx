import { NumberInput } from "@ark-ui/react/number-input";
import { SegmentGroup } from "@ark-ui/react/segment-group";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass, selectDisplay } from "../field-shell.js";
import { FieldMetadata } from "../field-metadata.js";
import { parseLeadingNumber } from "./dimension-parse.js";
import type { ControlRenderer, FieldProps } from "./index.js";
import css from "./dimension.css?inline";

type SelectField = Extract<Field, { type: "select" }>;

// Cast to the base ControlRenderer at the export: the registry is
// Record<string, ControlRenderer>, but resolveRenderer only dispatches here for
// select fields tagged metadata.control="dimension", so the field is a SelectField.
export const Dimension = (({
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

  // T7 will centralize preset/literal/unset derivation across all controls.
  // For T6: selected = membership via selectDisplay; an off-grid literal is
  // "set" (no sentinel) — the numeric input is its honest display.
  const { isUnset } = selectDisplay(value, selectField.options);
  // SegmentGroup value: stored string when a preset is selected; empty string
  // for off-grid or unset (Ark treats "" as "no selection" in controlled mode,
  // whereas undefined makes Ark ignore the prop and retain internal state).
  const storedStr = String(value ?? "");
  const chipValue = isUnset ? "" : storedStr;

  const unit = FieldMetadata.unit(selectField) ?? "";

  // Leading number from the stored string — used to seed the NumberInput.
  // For compound values ("0 auto", "1rem 0") this is the first token's number.
  // For unparseable values ("auto", "") this is undefined → input shows empty.
  const leadingNum = parseLeadingNumber(storedStr);
  // Ark NumberInput value prop is a controlled string; undefined → uncontrolled.
  // We drive it as a controlled string so re-opens reflect the stored value.
  const inputValue = leadingNum !== undefined ? String(leadingNum) : "";

  // Sentinel shows only when value is absent/unparseable AND not a preset member.
  // An off-grid literal that parses to a finite number is "set" — numeric input
  // covers it; no sentinel needed.
  const showSentinel = isUnset && leadingNum === undefined;

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel text={selectField.label ?? label} readOnly={readOnly} />
      <div className="dimension-root" data-role="dimension">
        {/* Preset chips */}
        <SegmentGroup.Root
          className="dimension-chips"
          value={chipValue}
          disabled={readOnly}
          onValueChange={(e) => {
            // e.value is string | null (Ark type); null means deselect — ignore,
            // chip selections are always-set once a preset is chosen.
            if (e.value !== null) {
              onChange(e.value);
            }
          }}
        >
          {showSentinel && (
            <span
              className="dimension-sentinel"
              data-role="dimension-sentinel"
              aria-label="No value set"
              title="No value set"
            >
              —
            </span>
          )}
          {selectField.options.map((opt) => {
            const strVal = String(opt.value);
            return (
              <SegmentGroup.Item
                key={strVal}
                value={strVal}
                className="dimension-chip"
                data-role="dimension-chip"
                data-value={strVal}
              >
                <SegmentGroup.ItemText>
                  {opt.label ?? strVal}
                </SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            );
          })}
        </SegmentGroup.Root>

        {/* Always-on numeric input — reflects and commits the leading number.
            Known limitation: compound values ("0 auto") lose their trailing part
            on numeric edit (only the leading token round-trips); chip selection
            remains the round-trip path for compound forms. Accepted for T6. */}
        <NumberInput.Root
          className="dimension-input-row"
          data-role="dimension-input"
          value={inputValue}
          readOnly={readOnly}
          disabled={readOnly}
          allowMouseWheel={false}
          clampValueOnBlur={false}
          onValueChange={(e) => {
            // Commit on every change so the preview updates in real-time.
            // A type check (not truthiness) lets the valid CSS value "0" through;
            // an empty string means the user cleared the input — leave the stored
            // value unchanged rather than persisting a bare unit string.
            if (typeof e.value === "string" && e.value !== "") {
              onChange(`${e.value}${unit}`);
            }
          }}
        >
          <NumberInput.Control
            className="dimension-input-control"
            data-disabled={readOnly ? "" : undefined}
          >
            <NumberInput.Input
              className="dimension-input-field"
              placeholder="—"
            />
            {unit && (
              <span className="dimension-unit-badge" aria-hidden>
                {unit}
              </span>
            )}
            <NumberInput.DecrementTrigger
              className="dimension-trigger"
              disabled={readOnly}
            >
              ↓
            </NumberInput.DecrementTrigger>
            <NumberInput.IncrementTrigger
              className="dimension-trigger"
              disabled={readOnly}
            >
              ↑
            </NumberInput.IncrementTrigger>
          </NumberInput.Control>
        </NumberInput.Root>
      </div>
    </div>
  );
}) as ControlRenderer;
