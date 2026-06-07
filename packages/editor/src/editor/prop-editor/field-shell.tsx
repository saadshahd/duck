/**
 * Shared field chrome: label + readonly badge, and the field wrapper class.
 * Extracted here so control renderers (segmented, swatch, …) can import them
 * without creating a circular value dependency:
 *   puck-fields.tsx → controls/index.ts → controls/segmented.tsx → puck-fields.tsx  (cycle)
 *   puck-fields.tsx → controls/index.ts → controls/segmented.tsx → field-shell.tsx  (fine)
 */

export const FieldLabel = ({
  text,
  readOnly,
}: {
  text: string;
  readOnly?: boolean;
}) => (
  <label>
    {text}
    {readOnly && (
      <span className="prop-readonly-badge" data-role="readonly-badge">
        <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden>
          <path
            d="M2 5V3a2.5 2.5 0 0 1 5 0v2"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
          <rect x="1" y="5" width="7" height="5" rx="1" fill="currentColor" />
        </svg>
        read-only
      </span>
    )}
  </label>
);

export const fieldClass = (readOnly?: boolean) =>
  `prop-field${readOnly ? " prop-field--readonly" : ""}`;
