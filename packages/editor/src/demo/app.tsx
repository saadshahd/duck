import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { config } from "./puck.config.js";
import { patternConfig } from "./pattern.config.js";
import { DemoEditor } from "../editor/demo-editor.js";
import sampleData from "./sample-data.json";

const params = new URLSearchParams(window.location.search);
const bridge = (() => {
  const url = params.get("bridge") ?? "ws://localhost:4400";
  const page = params.get("page") ?? "landing";
  return { url, page };
})();

declare global {
  interface Window {
    /** E2E seam: replace the document wholesale through the public `data`
     *  prop, the same edge a bridge/host push lands on. */
    __duckReplaceData?: (data: Data) => void;
  }
}

export function App() {
  const [data, setData] = useState<Data>(sampleData as Data);
  window.__duckReplaceData = setData;

  return (
    <DemoEditor
      data={data}
      config={config}
      patternConfig={patternConfig}
      onChange={setData}
      bridge={bridge}
    />
  );
}
