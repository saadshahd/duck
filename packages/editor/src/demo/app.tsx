import { useState } from "react";
import type { Spec } from "@json-render/core";
import { registry } from "./registry.js";
import { catalog } from "./catalog.js";
import { EditorShell } from "../editor/shell.js";
import sampleDoc from "./sample-document.json";

/** String-keyed prop schema lookup — decouples the editor from the catalog's literal type. */
const PROP_SCHEMAS = Object.fromEntries(
  Object.entries(catalog.data.components).map(([k, v]) => [k, v.props]),
);

export function App() {
  const [spec, setSpec] = useState<Spec>(sampleDoc as Spec);

  return (
    <EditorShell
      spec={spec}
      registry={registry}
      onSpecChange={setSpec}
      getPropSchema={(type) => PROP_SCHEMAS[type]}
      componentCatalog={catalog.data.components}
    />
  );
}
