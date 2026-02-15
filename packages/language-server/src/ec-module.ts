import {
  type Module,
  type LangiumCoreServices,
  type LangiumSharedCoreServices,
  type PartialLangiumCoreServices,
  type DefaultSharedCoreModuleContext,
  type DefaultCoreModuleContext,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
} from "langium";
import type { LangiumServices, PartialLangiumLSPServices } from "langium/lsp";
import {
  EcGeneratedModule,
  EcGeneratedSharedModule,
} from "./generated/module.js";
import { registerValidationChecks } from "./ec-validator.js";
import { EcCompletionProvider } from "./ec-completion-provider.js";

export type EcAddedServices = {
  // Will be extended for custom validators, scoping, etc.
};

export type EcServices = LangiumCoreServices & EcAddedServices;

export const EcModule: Module<
  EcServices,
  PartialLangiumCoreServices & EcAddedServices
> = {
  // Custom service overrides go here
};

/**
 * LSP module that overrides the default CompletionProvider with EC-specific completions.
 * Inject this after EcModule when running the full LSP server.
 */
export const EcLspModule: Module<LangiumServices, PartialLangiumLSPServices> = {
  lsp: {
    CompletionProvider: (services) => new EcCompletionProvider(services),
  },
};

/**
 * Create core (non-LSP) services. Use this for tests, CLI, and compiler.
 */
export function createEcServices(context: DefaultSharedCoreModuleContext): {
  shared: LangiumSharedCoreServices;
  Ec: EcServices;
} {
  const shared = inject(
    createDefaultSharedCoreModule(context),
    EcGeneratedSharedModule,
  );
  const Ec = inject(
    createDefaultCoreModule({ shared }),
    EcGeneratedModule,
    EcModule,
  );
  shared.ServiceRegistry.register(Ec);
  registerValidationChecks(Ec);
  return { shared, Ec };
}
