import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { Editor } from "../editor/editor.js";
import { config } from "./config.js";
import { patternConfig } from "./pattern.js";
import { fixture } from "./fixture.js";

/** The frozen-catalog test harness: the LIBRARY <Editor> driven by the frozen
 *  catalog + fixture. No DemoEditor, no bridge — the E2E suite boots this
 *  (/test.html), independent of the demo entry. */
declare global {
  interface Window {
    /** E2E seam: replace the document wholesale through the public `data`
     *  prop, the same edge a bridge/host push lands on. */
    __duckReplaceData?: (data: Data) => void;
  }
}

export function App() {
  const [data, setData] = useState<Data>(fixture);
  window.__duckReplaceData = setData;

  return (
    <Editor
      data={data}
      config={config}
      patternConfig={patternConfig}
      onChange={setData}
    />
  );
}
