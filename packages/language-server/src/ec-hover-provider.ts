import type { HoverProvider } from "langium/lsp";
import type { LangiumServices } from "langium/lsp";
import type { HoverParams, Hover } from "vscode-languageserver";
import { MarkupKind } from "vscode-languageserver";
import type { MaybePromise, LangiumDocument } from "langium";
import { CstUtils } from "langium";
import {
  extractReference,
  findResourceDefinition,
  extractResourceInfo,
  formatResourceHover,
} from "./ec-resource-index.js";

export class EcHoverProvider implements HoverProvider {
  private services: LangiumServices;

  constructor(services: LangiumServices) {
    this.services = services;
  }

  getHoverContent(
    document: LangiumDocument,
    params: HoverParams,
  ): MaybePromise<Hover | undefined> {
    const rootCst = document.parseResult?.value?.$cstNode;
    if (!rootCst) return undefined;

    const offset = document.textDocument.offsetAt(params.position);
    const leaf = CstUtils.findLeafNodeAtOffset(rootCst, offset);
    if (!leaf) return undefined;

    // Try the AST node at cursor, then its parent
    let astNode = leaf.astNode;
    let ref = extractReference(astNode);
    if (!ref && astNode.$container) {
      ref = extractReference(astNode.$container);
      if (ref) astNode = astNode.$container;
    }
    if (!ref) return undefined;

    const resolved = findResourceDefinition(
      this.services,
      ref.name,
      ref.resourceType,
    );
    if (!resolved) return undefined;

    const info = extractResourceInfo(resolved);
    const markdown = formatResourceHover(info);

    return {
      contents: { kind: MarkupKind.Markdown, value: markdown },
      range: {
        start: document.textDocument.positionAt(leaf.offset),
        end: document.textDocument.positionAt(leaf.end),
      },
    };
  }
}
