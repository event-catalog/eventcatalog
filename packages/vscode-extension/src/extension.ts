import * as vscode from "vscode";
import { startLanguageClient, stopLanguageClient } from "./language-client";
import { PreviewPanelManager } from "./preview-panel";

let previewManager: PreviewPanelManager;

export async function activate(context: vscode.ExtensionContext) {
  // Start language client (LSP for diagnostics, completion, etc.)
  startLanguageClient(context);

  // Create preview manager
  previewManager = new PreviewPanelManager(context);

  // Register preview command
  context.subscriptions.push(
    vscode.commands.registerCommand("eventcatalog.openPreview", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "ec") {
        previewManager.showPreview(editor);
      }
    }),
  );

  // Update preview on document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === "ec") {
        previewManager.onDocumentChanged(e.document);
      }
    }),
  );

  // Update preview when switching editors
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === "ec") {
        previewManager.onDocumentChanged(editor.document);
      }
    }),
  );
}

export function deactivate() {
  stopLanguageClient();
}
