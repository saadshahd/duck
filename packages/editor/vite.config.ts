import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const __dirname = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist-demo" },
  resolve: {
    alias: {
      "@duckeditor/spec": path.resolve(__dirname, "../spec/src/index.ts"),
      "@duckeditor/patterns": path.resolve(
        __dirname,
        "../patterns/src/index.ts",
      ),
    },
  },
});
