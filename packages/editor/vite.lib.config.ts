import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const external = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "@puckeditor/core",
  "@duckeditor/patterns",
  "@atlaskit/pragmatic-drag-and-drop",
  "@atlaskit/pragmatic-drag-and-drop-hitbox",
  "@floating-ui/react",
  "@xstate/react",
  "bippy",
  "fast-equals",
  "neverthrow",
  "react-shadow",
  "tinykeys",
  "xstate",
];

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: { index: "src/lib.ts", setup: "src/setup.ts" },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: (id) =>
        external.includes(id) ||
        external.some((dep) => id.startsWith(`${dep}/`)),
    },
  },
});
