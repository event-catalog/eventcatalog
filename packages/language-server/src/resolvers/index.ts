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
} from "./resolve.js";
/** @deprecated Use `resolveSpecImports` / `resolveSpecImportsAsync` instead. These aliases now handle both AsyncAPI and OpenAPI specs. */
export {
  resolveSpecImports as resolveAsyncApiImports,
  resolveSpecImportsAsync as resolveAsyncApiImportsAsync,
} from "./resolve.js";
