import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [
    {
      name: "resolve-js-to-ts",
      resolveId(source, importer) {
        if (source.endsWith(".js") && importer?.includes("/language-server/")) {
          const tsSource = source.replace(/\.js$/, ".ts");
          return path.resolve(path.dirname(importer), tsSource);
        }
      },
    },
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
