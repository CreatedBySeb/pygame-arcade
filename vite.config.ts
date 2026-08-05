import vue from "@vitejs/plugin-vue";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const PYODIDE_EXCLUDE: string[] = [
  "!**/*.{md,html}",
  "!**/*.d.ts",
  "!**/*.map",
  "!**/*.whl",
  "!**/pyodide/node_modules",
  "!package.json",
];

function copyPyodideAssets(): PluginOption {
  const pyodideDir = dirname(fileURLToPath(import.meta.resolve("pyodide")));

  return viteStaticCopy({
    targets: [
      {
        src: [join(pyodideDir, "*").replace(/\\/g, "/")].concat(
          PYODIDE_EXCLUDE,
        ),
        dest: "assets",
        rename: { stripBase: 4 },
      },
    ],
  });
}

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: { exclude: ["pyodide"] },
  plugins: [vue(), copyPyodideAssets()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
