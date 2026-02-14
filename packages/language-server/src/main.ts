import { startLanguageServer } from "langium/lsp";
import { createDefaultModule, createDefaultSharedModule } from "langium/lsp";
import { inject } from "langium";
import { NodeFileSystem } from "langium/node";
import {
  createConnection,
  ProposedFeatures,
} from "vscode-languageserver/node.js";
import {
  EcGeneratedModule,
  EcGeneratedSharedModule,
} from "./generated/module.js";
import { EcModule, EcLspModule } from "./ec-module.js";
import { registerValidationChecks } from "./ec-validator.js";

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
