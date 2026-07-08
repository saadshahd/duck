import { NumberInput } from "@ark-ui/react/number-input";
import { SegmentGroup } from "@ark-ui/react/segment-group";
import type { Field } from "@puckeditor/core";
import { useShadowSheet } from "../../overlay/index.js";
import { FieldLabel, fieldClass, resolveValueMode } from "../field-shell.js";
import { toDisplayLabel } from "../field-label.js";
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

  const presets = selectField.options.map((o) => String(o.value));
  const storedStr = String(value ?? "");
  const mode = resolveValueMode(value, presets);
  // SegmentGroup value: stored string when a preset is selected; empty string
  // for off-grid or unset (Ark treats "" as "no selection" in controlled mode,
  // whereas undefined makes Ark ignore the prop and retain internal state).
  const chipValue = mode.mode === "preset" ? mode.key : "";

  const unit = FieldMetadata.unit(selectField) ?? "";

  // Leading number from the stored string — used to seed the NumberInput.
  // For compound values ("0 auto", "1rem 0") this is the first token's number.
  // For unparseable values ("auto", "") this is undefined → input shows empty.
  const leadingNum = parseLeadingNumber(storedStr);
  // Ark NumberInput value prop is a controlled string; undefined → uncontrolled.
  // We drive it as a controlled string so re-opens reflect the stored value.
  const inputValue = leadingNum !== undefined ? String(leadingNum) : "";

  // Sentinel is always rendered so the user can click it to clear any set value.
  // It shows as "selected" (filled ring) only when the value is absent (unset).
  const isSentinelSelected = mode.mode === "unset";

  // A set value that matches no preset (off-grid or compound, e.g. "3rem 0"):
  // no chip lights and the sentinel stays empty, so the chip row alone reads as
  // "default" while the real value hides in the number field below. Mark it — a
  // front-anchored "Custom" marker in the selected state + an active-source tint
  // on the number field — so the value is legible from the dominant chip row.
  const isCustom = mode.mode === "literal";

  return (
    <div className={fieldClass(readOnly)}>
      <FieldLabel
        text={toDisplayLabel(label, selectField.label)}
        readOnly={readOnly}
      />
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
          <span
            className={`dimension-sentinel${isSentinelSelected ? " dimension-sentinel--selected" : ""}`}
            data-role="dimension-sentinel"
            data-selected={isSentinelSelected ? "" : undefined}
            aria-label={
              isSentinelSelected ? "No value set (current)" : "Clear value"
            }
            title={isSentinelSelected ? "No value set" : "Clear value"}
            onClick={() => {
              if (!readOnly) onChange(undefined);
            }}
          />
          {isCustom && (
            <span
              className="dimension-custom"
              data-role="dimension-custom"
              data-selected=""
              title={`Custom value: ${storedStr}`}
              aria-label={`Custom value ${storedStr}`}
            >
              Custom
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
            For compound values ("0 auto"), only the leading segment is replaced;
            the remaining segments are preserved (e.g. "10 auto" not just "10"). */}
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
              const newLeading = `${e.value}${unit}`;
              // Reconstruct compound values: split stored string into whitespace
              // tokens, replace the leading token (which contained the number we
              // are editing), and rejoin. This prevents "0 auto" → "10" dropping
              // the "auto" token. Only the first token is replaced.
              const tokens = storedStr.trim().split(/\s+/);
              const rebuilt =
                tokens.length > 1
                  ? [newLeading, ...tokens.slice(1)].join(" ")
                  : newLeading;
              onChange(rebuilt);
            }
          }}
        >
          <NumberInput.Control
            className="dimension-input-control"
            data-source={isCustom ? "custom" : undefined}
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
