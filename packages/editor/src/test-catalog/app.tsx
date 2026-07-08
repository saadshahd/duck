import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { Editor } from "../editor/editor.js";
import { config } from "./config.js";
import { patternConfig } from "./pattern.js";
import { fixture } from "./fixture.js";

/** The frozen-catalog test harness: the LIBRARY <Editor> driven by the frozen
 *  catalog + fixture. No DemoEditor, no bridge — the E2E suite boots this
 *  (/test.html), independent of the demo entry. */
export function App() {
  const [data, setData] = useState<Data>(fixture);

  return (
    <Editor
      data={data}
      config={config}
      patternConfig={patternConfig}
      onChange={setData}
    />
  );
}
