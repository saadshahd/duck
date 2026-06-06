import { useShadowSheet } from "../overlay/index.js";
import css from "./drag.css?inline";

type Props = { label: string };

/** Cycle destination for root content has no container border to tile: pin a
 *  labeled marker at the top of the viewport so the affordance stays visible. */
export function RootDropLabel({ label }: Props) {
  useShadowSheet(css);
  return (
    <div
      data-role="root-drop-label"
      className="drop-zone-label"
      style={{
        position: "fixed",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1,
      }}
    >
      {label}
    </div>
  );
}
