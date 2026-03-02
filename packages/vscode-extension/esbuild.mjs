import * as esbuild from "esbuild";
import {
  cpSync,
  mkdirSync,
  existsSync,
  readFileSync,
  appendFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const production = process.argv.includes("--production");

// Ensure output directories exist
mkdirSync(resolve(__dirname, "dist"), { recursive: true });
mkdirSync(resolve(__dirname, "syntaxes"), { recursive: true });

// Copy TextMate grammar from language-server
cpSync(
  resolve(__dirname, "../language-server/syntaxes/ec.tmLanguage.json"),
  resolve(__dirname, "syntaxes/ec.tmLanguage.json"),
);

const shared = {
  bundle: true,
  minify: production,
  sourcemap: !production,
};

// Build 1: Extension host (lightweight — no Langium/parser)
const extensionCtx = await esbuild.context({
  ...shared,
  entryPoints: [resolve(__dirname, "src/extension.ts")],
  outfile: resolve(__dirname, "dist/extension.js"),
  format: "cjs",
  platform: "node",
  external: ["vscode"],
  keepNames: true,
});

// Build 1b: Parser (heavy — includes Langium, loaded on demand)
const parserCtx = await esbuild.context({
  ...shared,
  entryPoints: [resolve(__dirname, "src/parser.ts")],
  outfile: resolve(__dirname, "dist/parser.js"),
  format: "cjs",
  platform: "node",
  external: ["vscode"],
});

// Build 2: Language server
const serverCtx = await esbuild.context({
  ...shared,
  entryPoints: [resolve(__dirname, "../language-server/dist/main.js")],
  outfile: resolve(__dirname, "dist/server.js"),
  format: "cjs",
  platform: "node",
  external: ["vscode"],
});

// Build 3: Webview (React app with visualiser)
const webviewCtx = await esbuild.context({
  ...shared,
  entryPoints: [resolve(__dirname, "src/webview/index.tsx")],
  outfile: resolve(__dirname, "dist/webview.js"),
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (watch) {
  // Copy visualiser CSS before starting watchers
  const visualiserCssWatch = resolve(
    __dirname,
    "../visualiser/dist/styles-core.css",
  );
  if (existsSync(visualiserCssWatch)) {
    const css = readFileSync(visualiserCssWatch, "utf-8");
    appendFileSync(resolve(__dirname, "dist/webview.css"), "\n" + css);
  }

  await Promise.all([
    extensionCtx.watch(),
    parserCtx.watch(),
    serverCtx.watch(),
    webviewCtx.watch(),
  ]);
  console.log("Watching for changes...");
} else {
  await Promise.all([
    extensionCtx.rebuild(),
    parserCtx.rebuild(),
    serverCtx.rebuild(),
    webviewCtx.rebuild(),
  ]);
  await Promise.all([
    extensionCtx.dispose(),
    parserCtx.dispose(),
    serverCtx.dispose(),
    webviewCtx.dispose(),
  ]);

  // Append visualiser CSS to the esbuild-generated webview.css
  const visualiserCss = resolve(
    __dirname,
    "../visualiser/dist/styles-core.css",
  );
  if (existsSync(visualiserCss)) {
    const css = readFileSync(visualiserCss, "utf-8");
    appendFileSync(resolve(__dirname, "dist/webview.css"), "\n" + css);
  }

  console.log("Build complete.");
}
