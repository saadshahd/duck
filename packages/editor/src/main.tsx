import "bippy";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./demo/app.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
