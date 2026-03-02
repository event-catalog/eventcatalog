import { defineEcConfig } from "@astrojs/starlight/expressive-code";
import { readFileSync } from "node:fs";

const ecLanguageGrammar = JSON.parse(
  readFileSync(
    new URL("../syntaxes/ec.tmLanguage.json", import.meta.url),
    "utf-8",
  ),
);

export default defineEcConfig({
  shiki: {
    langs: [ecLanguageGrammar],
    langAlias: {
      eventcatalog: "ec",
      ebnf: "txt",
    },
  },
});
