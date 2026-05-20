import type { Config } from "@puckeditor/core";
import { SLOT_PLACEHOLDER_TYPE } from "./inject-slot-placeholders.js";

const PLACEHOLDER_STYLE: React.CSSProperties = {
  border: "2px dashed rgba(120, 120, 120, 0.5)",
  borderRadius: 6,
  padding: 16,
  minHeight: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(120, 120, 120, 0.8)",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 500,
  textTransform: "lowercase",
  letterSpacing: "0.04em",
  pointerEvents: "auto",
  background: "rgba(0, 0, 0, 0.02)",
};

type PlaceholderProps = {
  id: string;
  parentId: string;
  slotKey: string;
};

const SlotPlaceholder = ({ slotKey }: PlaceholderProps) => (
  <div
    style={PLACEHOLDER_STYLE}
    data-duck-slot-placeholder="true"
    data-slot-key={slotKey}
  >
    <span>{slotKey}</span>
  </div>
);

/** Wrap a Puck config so it knows how to render the synthetic SlotPlaceholder. */
export const withSlotPlaceholder = <C extends Config>(config: C): C =>
  ({
    ...config,
    components: {
      ...config.components,
      [SLOT_PLACEHOLDER_TYPE]: {
        fields: {},
        render: SlotPlaceholder,
      },
    },
  }) as C;
