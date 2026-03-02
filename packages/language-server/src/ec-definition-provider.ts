import { DefaultDefinitionProvider } from "langium/lsp";
import type { LangiumServices } from "langium/lsp";
import type { DefinitionParams } from "vscode-languageserver";
import { LocationLink, Range } from "vscode-languageserver";
import type { MaybePromise, LangiumDocument } from "langium";
import { CstUtils, isCompositeCstNode } from "langium";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  extractReference,
  findResourceDefinition,
} from "./ec-resource-index.js";

/**
 * Patterns that contain file paths we want to make clickable.
 * Each regex must have a single capture group for the path string (with quotes).
 */
const PATH_PATTERNS = [
  /from\s+("(?:[^"\\]|\\.)*")/g, // import ... from "./file.ec"
  /path:\s*("(?:[^"\\]|\\.)*")/g, // @specification(path: "./spec.yml")
];

export class EcDefinitionProvider extends DefaultDefinitionProvider {
  private langiumServices: LangiumServices;

  constructor(services: LangiumServices) {
    super(services);
    this.langiumServices = services;
  }

  override getDefinition(
    document: LangiumDocument,
    params: DefinitionParams,
  ): MaybePromise<LocationLink[] | undefined> {
    // 1. File path links (import from, @specification path)
    const pathLink = this.resolvePathLink(document, params);
    if (pathLink) {
      return [pathLink];
    }

    // 2. Resource reference links (sends event X, service Y, etc.)
    const resourceLink = this.resolveResourceLink(document, params);
    if (resourceLink) {
      return [resourceLink];
    }

    return super.getDefinition(document, params);
  }

  private resolveResourceLink(
    document: LangiumDocument,
    params: DefinitionParams,
  ): LocationLink | undefined {
    const rootCst = document.parseResult?.value?.$cstNode;
    if (!rootCst) return undefined;

    const offset = document.textDocument.offsetAt(params.position);
    const leaf = CstUtils.findLeafNodeAtOffset(rootCst, offset);
    if (!leaf) return undefined;

    // Walk up to find the AST node that represents a reference
    let astNode = leaf.astNode;
    const ref = extractReference(astNode);
    if (!ref) {
      // Try parent — cursor might be on the name inside a ResourceRef
      if (astNode.$container) {
        const parentRef = extractReference(astNode.$container);
        if (parentRef) {
          astNode = astNode.$container;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }

    const reference = extractReference(astNode);
    if (!reference) return undefined;

    const resolved = findResourceDefinition(
      this.langiumServices,
      reference.name,
      reference.resourceType,
    );
    if (!resolved) return undefined;

    // Don't navigate to self
    const targetCst = resolved.node.$cstNode;
    if (!targetCst) return undefined;
    if (
      resolved.document.uri.toString() === document.uri.toString() &&
      targetCst.offset === astNode.$cstNode?.offset
    ) {
      return undefined;
    }

    const targetUri = resolved.document.uri.toString();
    const targetDoc = resolved.document.textDocument;
    const targetRange = Range.create(
      targetDoc.positionAt(targetCst.offset),
      targetDoc.positionAt(targetCst.end),
    );

    // Try to narrow to the name token for targetSelectionRange
    let nameRange = targetRange;
    if (
      "name" in resolved.node &&
      typeof resolved.node.name === "string" &&
      isCompositeCstNode(targetCst)
    ) {
      for (const child of targetCst.content) {
        if ("tokenType" in child && child.text === resolved.node.name) {
          nameRange = Range.create(
            targetDoc.positionAt(child.offset),
            targetDoc.positionAt(child.end),
          );
          break;
        }
      }
    }

    const sourceRange = Range.create(
      document.textDocument.positionAt(leaf.offset),
      document.textDocument.positionAt(leaf.end),
    );

    return LocationLink.create(targetUri, targetRange, nameRange, sourceRange);
  }

  private resolvePathLink(
    document: LangiumDocument,
    params: DefinitionParams,
  ): LocationLink | undefined {
    const text = document.textDocument.getText();
    const offset = document.textDocument.offsetAt(params.position);

    for (const pattern of PATH_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const pathWithQuotes = match[1];
        const pathStart = match.index + match[0].indexOf(pathWithQuotes);
        const pathEnd = pathStart + pathWithQuotes.length;

        if (offset >= pathStart && offset <= pathEnd) {
          const filePath = pathWithQuotes.slice(1, -1);
          return this.createFileLink(document, filePath, pathStart, pathEnd);
        }
      }
    }
    return undefined;
  }

  private createFileLink(
    document: LangiumDocument,
    filePath: string,
    sourceStart: number,
    sourceEnd: number,
  ): LocationLink | undefined {
    const docPath = fileURLToPath(document.uri.toString());
    const resolved = resolve(dirname(docPath), filePath);

    if (!existsSync(resolved)) {
      return undefined;
    }

    const targetUri = pathToFileURL(resolved).toString();
    const zeroRange = Range.create(0, 0, 0, 0);
    const sourceRange = Range.create(
      document.textDocument.positionAt(sourceStart),
      document.textDocument.positionAt(sourceEnd),
    );

    return LocationLink.create(targetUri, zeroRange, zeroRange, sourceRange);
  }
}
