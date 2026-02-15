import { describe, it, expect } from "vitest";
import { createEcServices } from "../src/ec-module.js";
import { EmptyFileSystem } from "langium";
import { parseDocument } from "langium/test";
import type { Program } from "../src/generated/ast.js";
import { astToGraph } from "../src/graph.js";
import { examples } from "../../playground/src/examples.js";

const services = createEcServices(EmptyFileSystem);

const LOCAL_IMPORT_RE =
  /import\s*\{[^}]*\}\s*from\s*"(?!https?:\/\/)([^"]+)"\s*\n?/g;

function combineSourceFiles(source: Record<string, string>): string {
  const mainFile = "main.ec";
  const supportingFiles = Object.keys(source).filter((f) => f !== mainFile);
  const concatOrder = [...supportingFiles, mainFile];

  const parts: string[] = [];
  for (const filename of concatOrder) {
    let content = source[filename];
    // Strip local file imports since we're concatenating all files
    content = content.replace(LOCAL_IMPORT_RE, "");
    parts.push(content);
  }

  return parts.join("\n");
}

function hasRemoteImports(source: Record<string, string>): boolean {
  const urlImportRe = /import\s*\{[^}]*\}\s*from\s*"(https?:\/\/[^"]+)"/;
  return Object.values(source).some((content) => urlImportRe.test(content));
}

async function parseProgram(input: string): Promise<Program> {
  const doc = await parseDocument<Program>(services.Ec, input);
  return doc.parseResult.value;
}

describe("playground examples snapshot tests", () => {
  for (const example of examples) {
    if (hasRemoteImports(example.source)) {
      it.skip(`${example.name} (skipped: remote URL imports)`, () => {});
      continue;
    }

    it(`${example.name}`, async () => {
      const combined = combineSourceFiles(example.source);
      const program = await parseProgram(combined);
      const graph = astToGraph(program);

      // Snapshot nodes and edges separately for clearer diffs
      expect(graph.nodes).toMatchSnapshot(`${example.name} - nodes`);
      expect(graph.edges).toMatchSnapshot(`${example.name} - edges`);
    });
  }
});
