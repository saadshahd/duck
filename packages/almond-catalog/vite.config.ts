import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Demo harness only — the library itself is built with tsc (see tsconfig.build.json).
export default defineConfig({
  plugins: [react()],
});
