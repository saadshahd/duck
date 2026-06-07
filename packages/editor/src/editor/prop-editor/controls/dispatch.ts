import type { Field } from "@puckeditor/core";
import { FieldMetadata } from "../field-metadata.js";
import type { FieldProps, ControlRenderer } from "./index.js";

/** Pure dispatch: metadata.control (if registered) → field.type → undefined (FallbackField).
 *  Injectable registries make this unit-testable without the React component tree. */
export const resolveRenderer = (
  props: FieldProps<Field, unknown>,
  controlRenderers: Record<string, ControlRenderer>,
  typeRenderers: Record<string, ControlRenderer>,
): ControlRenderer | undefined => {
  const controlId = FieldMetadata.control(props.field);
  if (controlId && controlRenderers[controlId])
    return controlRenderers[controlId];
  return typeRenderers[props.field.type];
};
