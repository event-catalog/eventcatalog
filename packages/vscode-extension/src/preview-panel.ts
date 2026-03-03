import * as vscode from "vscode";
import * as path from "node:path";

const LOG_PREFIX = "[EventCatalog Preview]";

export class PreviewPanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private context: vscode.ExtensionContext;
  private cachedFileUris: vscode.Uri[] | null = null;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private pendingDocument: vscode.TextDocument | undefined;
  private webviewReady = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // Watch for file creation/deletion to invalidate cached file list
    this.fileWatcher =
      vscode.workspace.createFileSystemWatcher("**/*.{ec,yaml,yml}");
    this.fileWatcher.onDidCreate(() => {
      this.cachedFileUris = null;
    });
    this.fileWatcher.onDidDelete(() => {
      this.cachedFileUris = null;
    });
    context.subscriptions.push(this.fileWatcher);
  }

  showPreview(editor: vscode.TextEditor) {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.onDocumentChanged(editor.document);
    } else {
      this.webviewReady = false;
      this.panel = vscode.window.createWebviewPanel(
        "eventcatalog.preview",
        "EventCatalog Preview",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, "dist"),
          ],
        },
      );
      // Queue the initial document for when webview is ready
      this.pendingDocument = editor.document;

      this.panel.webview.html = this.getHtml(this.panel.webview);

      // Listen for ready signal from webview
      this.panel.webview.onDidReceiveMessage((message) => {
        if (message.type === "ready") {
          this.webviewReady = true;
          console.log(
            LOG_PREFIX,
            "Webview ready, pending:",
            !!this.pendingDocument,
          );
          if (this.pendingDocument) {
            this.onDocumentChanged(this.pendingDocument);
            this.pendingDocument = undefined;
          }
        }
      });

      this.panel.onDidDispose(() => {
        console.log(LOG_PREFIX, "Panel disposed");
        this.panel = undefined;
        this.webviewReady = false;
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = undefined;
        }
      });
    }
  }

  async onDocumentChanged(document: vscode.TextDocument) {
    if (!this.panel) return;

    // If webview isn't ready yet, just store the pending document
    if (!this.webviewReady) {
      this.pendingDocument = document;
      return;
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      try {
        const files = await this.getWorkspaceFiles(document);
        const parserPath = path.join(__dirname, "parser.js");
        const { parseWorkspaceFiles } = require(parserPath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          document.uri,
        );
        const basePath = workspaceFolder?.uri.fsPath;
        const activeFile = vscode.workspace.asRelativePath(document.uri);
        const graph = await parseWorkspaceFiles(
          files,
          undefined,
          basePath,
          activeFile,
        );
        console.log(
          LOG_PREFIX,
          `Parsed ${Object.keys(files).length} file(s) → ${graph.nodes?.length ?? 0} nodes, ${graph.edges?.length ?? 0} edges`,
        );
        this.panel?.webview.postMessage({ type: "update-graph", graph });
      } catch (err) {
        console.error(LOG_PREFIX, "Parse failed:", err);
      }
    }, 150);
  }

  private async getWorkspaceFiles(
    activeDocument: vscode.TextDocument,
  ): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Include the active document first (it's the "main" file)
    const activePath = vscode.workspace.asRelativePath(activeDocument.uri);
    files[activePath] = activeDocument.getText();

    // Use cached file list, only scan workspace when cache is invalidated.
    // Load all .ec files and all spec files (yaml/yml). Spec files may live
    // in subdirectories separate from .ec files (e.g., ./asyncapi-files/spec.yml)
    // so we cannot restrict to co-located directories. The parser only uses
    // spec files that are actually referenced by imports.
    if (!this.cachedFileUris) {
      const [ecFiles, specFiles] = await Promise.all([
        vscode.workspace.findFiles("**/*.ec", "**/node_modules/**"),
        vscode.workspace.findFiles("**/*.{yaml,yml}", "**/node_modules/**"),
      ]);

      this.cachedFileUris = [...ecFiles, ...specFiles];
      console.log(
        LOG_PREFIX,
        `Workspace scan: ${ecFiles.length} .ec file(s), ${specFiles.length} spec file(s)`,
      );
    }

    for (const fileUri of this.cachedFileUris) {
      const relativePath = vscode.workspace.asRelativePath(fileUri);
      if (relativePath === activePath) continue;
      const content = await vscode.workspace.fs.readFile(fileUri);
      files[relativePath] = Buffer.from(content).toString("utf-8");
    }

    return files;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css"),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <style>
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
