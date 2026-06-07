import { ToggleGroup } from "@ark-ui/react/toggle-group";
import { useShadowSheet } from "../overlay/index.js";
import css from "./ark-spike.css?inline";

/**
 * THROWAWAY — T1 GO/NO-GO proof that an Ark UI primitive renders, is
 * keyboard-navigable, holds focus, and accepts plain CSS inside the editor's
 * open shadow root. T4 replaces this with the real segmented control and deletes
 * this file + ark-spike.css. Mounted inside PropSheet.Panel (under
 * ArkEnvironment). Items expose data-role / data-value for the E2E observer.
 */
export function ArkSpike() {
  useShadowSheet(css);
  return (
    <ToggleGroup.Root
      className="ark-spike"
      data-role="ark-spike-toggle"
      defaultValue={["left"]}
    >
      {["left", "center", "right"].map((value) => (
        <ToggleGroup.Item
          key={value}
          value={value}
          className="ark-spike-item"
          data-role="ark-spike-item"
          data-value={value}
        >
          {value}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
