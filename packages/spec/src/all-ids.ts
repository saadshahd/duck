import type { Data } from "@puckeditor/core";
import { preOrder } from "./pre-order.js";

/** All component ids in pre-order (component first, then children). */
export const allIds = (data: Data): readonly string[] =>
  [...preOrder(data)].map((visit) => visit.component.props.id as string);
