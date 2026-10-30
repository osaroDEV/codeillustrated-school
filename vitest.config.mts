import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Node 25+ defines its own global localStorage, which shadows jsdom's and
    // is unusable without --localstorage-file. The flag exists from Node 22.
    execArgv:
      Number(process.versions.node.split(".")[0]) >= 22 ? ["--no-experimental-webstorage"] : [],
    exclude: ["node_modules", ".next", "out"],
  },
});
