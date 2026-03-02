import type { Formatter } from "langium/lsp";
import type {
  DocumentFormattingParams,
  DocumentOnTypeFormattingOptions,
  DocumentOnTypeFormattingParams,
  DocumentRangeFormattingParams,
  TextEdit,
} from "vscode-languageserver";
import { Range } from "vscode-languageserver";
import type { LangiumDocument } from "langium";
import { formatEc } from "./formatter.js";

export class EcFormatterProvider implements Formatter {
  formatDocument(
    document: LangiumDocument,
    _params: DocumentFormattingParams,
  ): TextEdit[] {
    const text = document.textDocument.getText();
    const formatted = formatEc(text);
    if (formatted === text) return [];

    const end = document.textDocument.positionAt(text.length);

    return [
      {
        range: Range.create(0, 0, end.line, end.character),
        newText: formatted,
      },
    ];
  }

  formatDocumentRange(
    document: LangiumDocument,
    _params: DocumentRangeFormattingParams,
  ): TextEdit[] {
    // For simplicity, format the full document
    return this.formatDocument(document, _params as DocumentFormattingParams);
  }

  formatDocumentOnType(
    _document: LangiumDocument,
    _params: DocumentOnTypeFormattingParams,
  ): TextEdit[] {
    return [];
  }

  get formatOnTypeOptions(): DocumentOnTypeFormattingOptions | undefined {
    return undefined;
  }
}
