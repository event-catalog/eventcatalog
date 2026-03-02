export type {
  SpecMessage,
  SpecChannel,
  SpecOperation,
  SpecService,
  ResourceType,
  ResolveError,
  SpecResolveResult,
  FetchFn,
} from "./types.js";
export {
  parseSpec,
  extractMessages,
  extractChannels,
  extractService,
  messageToEc,
  channelToEc,
  serviceToEc,
  escapeEc,
} from "./asyncapi.js";
export {
  parseOpenApiSpec,
  extractOpenApiService,
  openApiServiceToEc,
  openApiMessageToEc,
} from "./openapi.js";
export type { ParsedOpenApiSpec } from "./openapi.js";
export {
  resolveSpecImports,
  resolveSpecImportsAsync,
  detectSpecType,
  isSpecFile,
} from "./resolve.js";
export {
  parseCatalogResources,
  parseCatalogServices,
  clearCatalogCache,
} from "./catalog.js";
export { isCatalogPath } from "./types.js";
/** @deprecated Use `resolveSpecImports` / `resolveSpecImportsAsync` instead. These aliases now handle both AsyncAPI and OpenAPI specs. */
export {
  resolveSpecImports as resolveAsyncApiImports,
  resolveSpecImportsAsync as resolveAsyncApiImportsAsync,
} from "./resolve.js";
