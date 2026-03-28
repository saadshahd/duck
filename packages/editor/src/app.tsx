import { useState } from "react";
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";
import type { Spec } from "@json-render/core";
import { registry } from "./demo-registry.js";
import sampleDoc from "./sample-document.json";

export function App() {
  const [spec] = useState<Spec>(sampleDoc as Spec);

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <Renderer spec={spec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
