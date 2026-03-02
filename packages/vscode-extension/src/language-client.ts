import * as vscode from "vscode";
import * as path from "node:path";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export function startLanguageClient(
  context: vscode.ExtensionContext,
): LanguageClient {
  const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  const clientOptions = {
    documentSelector: [{ scheme: "file", language: "ec" }],
  };

  client = new LanguageClient(
    "eventcatalog-dsl",
    "EventCatalog DSL",
    serverOptions,
    clientOptions,
  );
  client.start();
  return client;
}

export function stopLanguageClient(): Thenable<void> | undefined {
  return client?.stop();
}
