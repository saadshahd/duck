import type { ComponentData, Data } from "@puckeditor/core";
import { slotKeysOf } from "./slot-keys-of.js";

type Replacement = readonly [component: ComponentData, replaced: boolean];

const replaceChild = (
  child: ComponentData,
  args: { id: string; node: ComponentData },
): Replacement => {
  if (child.props.id === args.id) {
    return [args.node, true];
  }

  const slots = slotKeysOf(child);
  const replaced = slots
    .map((slotKey) => {
      const children = child.props[slotKey] as ComponentData[];
      const nextChildren = children.map((candidate) =>
        replaceChild(candidate, args),
      );
      return nextChildren.some(([, replaced]) => replaced)
        ? {
            slotKey,
            children: nextChildren.map(([component]) => component),
          }
        : null;
    })
    .find((result) => result !== null);

  return replaced
    ? [
        {
          ...child,
          props: { ...child.props, [replaced.slotKey]: replaced.children },
        },
        true,
      ]
    : [child, false];
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
