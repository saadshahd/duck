import type { ComponentData, Data } from "@puckeditor/core";
import { mapComponent } from "./map-component.js";

type Replacement = readonly [component: ComponentData, replaced: boolean];

const replaceChild = (
  child: ComponentData,
  args: { id: string; node: ComponentData },
): Replacement => {
  if (child.props.id === args.id) {
    return [args.node, true];
  }

  let replaced = false;
  const next = mapComponent(child, (candidate) => {
    const [component, did] = replaceChild(candidate, args);
    replaced ||= did;
    return [component];
  });

  return replaced ? [next, true] : [child, false];
};

export const replaceById = (
  data: Data,
  args: { id: string; node: ComponentData },
): Data => {
  const nextContent = data.content.map((child) => replaceChild(child, args));
  return nextContent.some(([, replaced]) => replaced)
    ? {
        ...data,
        content: nextContent.map(([component]) => component),
      }
    : data;
};
