import {
  type Module,
  type LangiumCoreServices,
  type LangiumSharedCoreServices,
  type PartialLangiumCoreServices,
  type DefaultSharedCoreModuleContext,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
} from "langium";
import {
  EcGeneratedModule,
  EcGeneratedSharedModule,
} from "./generated/module.js";
import { registerValidationChecks } from "./ec-validator.js";

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
