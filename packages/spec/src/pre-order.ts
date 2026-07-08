import type { ComponentData, Data } from "@puckeditor/core";
import { getIn, type Path } from "./path.js";
import { slotPathsOf } from "./slot-keys-of.js";

type Visit = { readonly component: ComponentData; readonly path: Path };

function* walkComponent(component: ComponentData, path: Path): Iterable<Visit> {
  yield { component, path };
  const parentId = component.props.id as string;
  for (const slotPath of slotPathsOf(component)) {
    const children = getIn(component.props, slotPath) as ComponentData[];
    for (let index = 0; index < children.length; index++) {
      yield* walkComponent(children[index], [
        ...path,
        { at: "slot", parentId, path: slotPath, index },
      ]);
    }
  }
}

/** Pre-order traversal (parents before children). Yields each component with its path. */
export function* preOrder(data: Data): Iterable<Visit> {
  for (let index = 0; index < data.content.length; index++) {
    yield* walkComponent(data.content[index], [{ at: "root", index }]);
  }
}
