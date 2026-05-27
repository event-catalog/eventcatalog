import { defineConfig } from "tsup";

export default defineConfig({
  target: "es2020",
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
  },
  outDir: "dist",
  shims: true,
});
