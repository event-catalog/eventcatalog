import { startLanguageServer } from "langium/lsp";
import { createDefaultModule, createDefaultSharedModule } from "langium/lsp";
import type { LangiumServices, PartialLangiumLSPServices } from "langium/lsp";
import { type Module, inject } from "langium";
import { NodeFileSystem } from "langium/node";
import {
  createConnection,
  ProposedFeatures,
} from "vscode-languageserver/node.js";
import {
  EcGeneratedModule,
  EcGeneratedSharedModule,
} from "./generated/module.js";
import { EcModule } from "./ec-module.js";
import { EcCompletionProvider } from "./ec-completion-provider.js";
import { EcDefinitionProvider } from "./ec-definition-provider.js";
import { EcHoverProvider } from "./ec-hover-provider.js";
import { EcFormatterProvider } from "./ec-formatter-provider.js";
import { registerValidationChecks } from "./ec-validator.js";

/**
 * LSP module that overrides default providers with EC-specific implementations.
 */
const EcLspModule: Module<LangiumServices, PartialLangiumLSPServices> = {
  lsp: {
    CompletionProvider: (services) => new EcCompletionProvider(services),
    DefinitionProvider: (services) => new EcDefinitionProvider(services),
    HoverProvider: (services) => new EcHoverProvider(services),
    Formatter: () => new EcFormatterProvider(),
  },
};

const connection = createConnection(ProposedFeatures.all);

const shared = inject(
  createDefaultSharedModule({ connection, ...NodeFileSystem }),
  EcGeneratedSharedModule,
);
const Ec = inject(
  createDefaultModule({ shared }),
  EcGeneratedModule,
  EcModule,
  EcLspModule,
);
shared.ServiceRegistry.register(Ec);
registerValidationChecks(Ec);

startLanguageServer(shared);
