import type { ComponentData, Data } from "@puckeditor/core";
import type { Path } from "./path.js";
import { slotKeysOf } from "./slot-keys-of.js";

type Visit = { readonly component: ComponentData; readonly path: Path };

function* walkComponent(component: ComponentData, path: Path): Iterable<Visit> {
  yield { component, path };
  for (const slotKey of slotKeysOf(component)) {
    const children = component.props[slotKey] as ComponentData[];
    for (let index = 0; index < children.length; index++) {
      yield* walkComponent(children[index], [
        ...path,
        { parentId: component.props.id as string, slotKey, index },
      ]);
    }
  }
}

/** Pre-order traversal (parents before children). Yields each component with its path. */
export function* preOrder(data: Data): Iterable<Visit> {
  for (let index = 0; index < data.content.length; index++) {
    yield* walkComponent(data.content[index], [
      { parentId: null, slotKey: null, index },
    ]);
  }
}
