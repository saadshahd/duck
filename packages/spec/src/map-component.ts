import type { ComponentData } from "@puckeditor/core";
import { slotKeysOf } from "./slot-keys-of.js";

export function mapComponent(
  component: ComponentData,
  visit: (child: ComponentData) => ComponentData[],
): ComponentData {
  const slotOverrides = Object.fromEntries(
    slotKeysOf(component).map((key) => [
      key,
      component.props[key].flatMap(visit),
    ]),
  );
  return {
    ...component,
    props: { ...component.props, ...slotOverrides },
  } as ComponentData;
}
