import type { ComponentData } from "@puckeditor/core";

export function fingerprint(component: ComponentData): string {
  return component.type;
}
