import type { Puck } from "@puckeditor/core";
import type { ComponentProps } from "react";
import type { EditorProps } from "./editor/editor.js";

export { Editor } from "./editor/editor.js";
export type { EditorProps } from "./editor/editor.js";
export type { Data, Config } from "@puckeditor/core";

type PuckProps = ComponentProps<typeof Puck>;
type ChromeOnly =
  | "iframe"
  | "renderHeader"
  | "renderHeaderActions"
  | "headerTitle"
  | "headerPath"
  | "viewports"
  | "dnd"
  | "height"
  | "_experimentalFullScreenCanvas"
  | "_experimentalVirtualization";

/**
 * Compile-time guard: every non-chrome PuckProps key must remain assignable
 * to EditorProps. If Puck adds a new prop and Duck doesn't extend EditorProps
 * (or expand ChromeOnly), this fails to compile — forcing a deliberate
 * design decision rather than silent drift.
 */
type _ParityCheck = Omit<PuckProps, ChromeOnly>;
const _parity: _ParityCheck = {} as EditorProps;
void _parity;
