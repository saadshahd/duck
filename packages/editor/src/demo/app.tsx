import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { config } from "./puck.config.js";
import { EditorShell } from "../editor/shell.js";
import sampleData from "./sample-data.json";

const params = new URLSearchParams(window.location.search);
const bridge = (() => {
  const url = params.get("bridge") ?? "ws://localhost:4400";
  const page = params.get("page") ?? "landing";
  return { url, page };
})();

export function App() {
  const [data, setData] = useState<Data>(sampleData as Data);

  return (
    <EditorShell
      data={data}
      config={config}
      onDataChange={setData}
      bridge={bridge}
    />
  );
}
