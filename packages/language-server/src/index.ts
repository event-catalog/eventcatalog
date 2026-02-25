// Public API exports
export { createEcServices, EcLspModule } from "./ec-module.js";
export type { EcServices, EcAddedServices } from "./ec-module.js";
export { EcCompletionProvider } from "./ec-completion-provider.js";
export { EcLanguageMetaData } from "./generated/module.js";
export * from "./generated/ast.js";
export { astToGraph } from "./graph.js";
export type { GraphNode, GraphEdge, DslGraph } from "./graph-types.js";
export { compile } from "./compiler.js";
export type { CompiledOutput, CompileOptions } from "./compiler.js";
export * from "./ast-utils.js";
export { formatEc } from "./formatter.js";
export {
  parseSpec,
  extractMessages,
  extractChannels,
  extractService,
  messageToEc,
  channelToEc,
  serviceToEc,
  resolveAsyncApiImports,
  resolveAsyncApiImportsAsync,
} from "./resolvers/index.js";
export type {
  SpecMessage,
  SpecChannel,
  SpecOperation,
  SpecService,
  ResourceType,
  ResolveError,
  SpecResolveResult,
  FetchFn,
} from "./resolvers/index.js";
