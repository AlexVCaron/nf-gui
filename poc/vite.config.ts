import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const monacoDirectory = resolve(
  dirname(fileURLToPath(import.meta.resolve("monaco-editor"))),
  "../..",
);

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "monaco-editor/min/vs/editor/editor.main.css",
        replacement: resolve(monacoDirectory, "min/vs/editor/editor.main.css"),
      },
    ],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
