import { defineConfig } from "@rslib/core";

// @ai codex:other
export default defineConfig({
  lib: [
    {
      banner: { js: "#!/usr/bin/env node" },
      dts: true,
      format: "esm",
      syntax: "esnext",
    },
  ],
  output: { minify: false, target: "node" },
  source: {
    entry: { index: "./src/index.ts" },
    tsconfigPath: "tsconfig.build.json",
  },
});
// @end-ai
