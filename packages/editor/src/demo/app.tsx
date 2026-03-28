import { useState } from "react";
import type { Spec } from "@json-render/core";
import { registry } from "./registry.js";
import { EditorShell } from "../editor/shell.js";
import sampleDoc from "./sample-document.json";

export function App() {
  const [spec] = useState<Spec>(sampleDoc as Spec);

  return <EditorShell spec={spec} registry={registry} />;
}
