import type { ComponentData } from "@puckeditor/core";
import { getIn, type SlotPath } from "./path.js";
import { slotPathsOf } from "./slot-keys-of.js";

/** Immutable set along a prop-path whose intermediates already exist —
 *  every segment came from `slotPathsOf` walking this very tree. */
function setIn(
  target: unknown,
  path: SlotPath,
  value: ComponentData[],
): unknown {
  const [head, ...rest] = path;
  const next =
    rest.length === 0
      ? value
      : setIn((target as Record<string | number, unknown>)[head], rest, value);
  if (typeof head === "number") {
    const arr = [...(target as unknown[])];
    arr[head] = next;
    return arr;
  }
  return { ...(target as Record<string, unknown>), [head]: next };
}

/** Maps `visit` over every slot's children, at any prop nesting depth
 *  (top-level, array-item, object-nested) — matching `slotPathsOf`'s reach.
 *  Does not recurse into children itself; `visit` decides whether to. */
export function mapComponent(
  component: ComponentData,
  visit: (child: ComponentData) => ComponentData[],
): ComponentData {
  const nextProps = slotPathsOf(component).reduce(
    (props, path) =>
      setIn(
        props,
        path,
        (getIn(props, path) as ComponentData[]).flatMap(visit),
      ) as ComponentData["props"],
    component.props,
  );
  return { ...component, props: nextProps } as ComponentData;
}
