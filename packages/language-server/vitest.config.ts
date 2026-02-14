import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["import", "module", "browser", "default"],
  },
  plugins: [
    {
      name: "resolve-js-to-ts",
      resolveId(source, importer) {
        if (source.endsWith(".js") && importer?.includes("/language-server/")) {
          return source.replace(/\.js$/, ".ts");
        }
      },
    },
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
