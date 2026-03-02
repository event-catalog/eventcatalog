/**
 * Browser-safe exports from the language server.
 * This entry point excludes Node.js-only modules (EcCompletionProvider, Langium LSP).
 * Use `@eventcatalog/language-server/browser` in browser environments (playground, etc.).
 */

// Completion data (snippets, annotations, context suggestions)
export {
  RESOURCE_KEYWORDS,
  COMMON_PROPS,
  ANNOTATION_SUGGESTIONS,
  CONTEXT_SUGGESTIONS,
  MESSAGE_TYPE_PLURAL,
} from "./completion-data.js";
export type { Suggestion } from "./completion-data.js";

// Completion utils (browser-safe helpers)
export {
  collectRegexMatches,
  collectChannelNames,
  collectMessageNames,
  extractResourceVersions,
  parseSpecAuto,
  findEnclosingResource,
} from "./completion-utils.js";
export type { ParsedSpecResult } from "./completion-utils.js";

// Core services (browser-safe — no LSP/CompletionProvider dependency)
export { createEcServices } from "./ec-module.js";
export type { EcServices, EcAddedServices } from "./ec-module.js";

// AST, graph, compiler, formatter
export * from "./generated/ast.js";
export { astToGraph } from "./graph.js";
export type { GraphNode, GraphEdge, DslGraph } from "./graph-types.js";
export { compile } from "./compiler.js";
export type { CompiledOutput, CompileOptions } from "./compiler.js";
export * from "./ast-utils.js";
export { formatEc } from "./formatter.js";

// Resolvers
export {
  parseSpec,
  extractMessages,
  extractChannels,
  extractService,
  messageToEc,
  channelToEc,
  serviceToEc,
  parseOpenApiSpec,
  extractOpenApiService,
  openApiServiceToEc,
  openApiMessageToEc,
  resolveSpecImports,
  resolveSpecImportsAsync,
  detectSpecType,
  isSpecFile,
  resolveAsyncApiImports,
  resolveAsyncApiImportsAsync,
} from "./resolvers/index.js";
export type { ParsedOpenApiSpec } from "./resolvers/index.js";
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
