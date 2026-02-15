import { startLanguageServer } from "langium/lsp";
import { createDefaultModule, createDefaultSharedModule } from "langium/lsp";
import { EmptyFileSystem, inject } from "langium";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
} from "vscode-languageserver/browser.js";
import {
  EcGeneratedModule,
  EcGeneratedSharedModule,
} from "./generated/module.js";
import { EcModule } from "./ec-module.js";
import { registerValidationChecks } from "./ec-validator.js";

declare const self: any;

const reader = new BrowserMessageReader(self);
const writer = new BrowserMessageWriter(self);
const connection = createConnection(reader, writer);

const shared = inject(
  createDefaultSharedModule({ connection, ...EmptyFileSystem }),
  EcGeneratedSharedModule,
);
const Ec = inject(createDefaultModule({ shared }), EcGeneratedModule, EcModule);
shared.ServiceRegistry.register(Ec);
registerValidationChecks(Ec);

startLanguageServer(shared);
