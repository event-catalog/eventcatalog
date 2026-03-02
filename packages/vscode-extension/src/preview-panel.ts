import * as vscode from "vscode";
import * as path from "node:path";

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
      this.panel.webview.html = this.getHtml(this.panel.webview);

      // Listen for ready signal from webview
      this.panel.webview.onDidReceiveMessage((message) => {
        if (message.type === "ready" && this.pendingDocument) {
          this.webviewReady = true;
          this.onDocumentChanged(this.pendingDocument);
          this.pendingDocument = undefined;
        }
      });

      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.webviewReady = false;
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = undefined;
        }
      });

      // Queue the initial document for when webview is ready
      this.pendingDocument = editor.document;
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
        this.panel?.webview.postMessage({ type: "update-graph", graph });
      } catch (err) {
        console.error("[EventCatalog Preview]", err);
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
    // Load all .ec files, but only load spec files (yaml/yml) that sit in
    // the same directories as .ec files. This prevents loading hundreds of
    // irrelevant files from catalog project directories (which are resolved
    // via the SDK instead). JSON files are excluded entirely — OpenAPI JSON
    // specs can be renamed to .yaml or referenced via URL import.
    if (!this.cachedFileUris) {
      const ecFiles = await vscode.workspace.findFiles(
        "**/*.ec",
        "**/node_modules/**",
      );

      // Collect directories that contain .ec files
      const ecDirs = new Set<string>();
      for (const uri of ecFiles) {
        const rel = vscode.workspace.asRelativePath(uri);
        const dir = rel.includes("/")
          ? rel.substring(0, rel.lastIndexOf("/"))
          : "";
        ecDirs.add(dir);
      }

      // Load spec files only from directories that contain .ec files
      const specFiles = await vscode.workspace.findFiles(
        "**/*.{yaml,yml}",
        "**/node_modules/**",
      );
      const relevantSpecFiles = specFiles.filter((uri) => {
        const rel = vscode.workspace.asRelativePath(uri);
        const dir = rel.includes("/")
          ? rel.substring(0, rel.lastIndexOf("/"))
          : "";
        return ecDirs.has(dir);
      });

      this.cachedFileUris = [...ecFiles, ...relevantSpecFiles];
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
