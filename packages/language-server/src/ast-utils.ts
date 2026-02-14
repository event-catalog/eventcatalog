import type { AstNode } from "langium";
import {
  isVersionStmt,
  isNameStmt,
  isSummaryStmt,
  isOwnerStmt,
  isDeprecatedStmt,
  isDraftStmt,
  isLegendStmt,
  isSearchStmt,
  isToolbarStmt,
  isFocusModeStmt,
  isAnimatedStmt,
  isStyleStmt,
  isSchemaStmt,
  isServiceDef,
  isSubdomainDef,
  isContainerDef,
  isFlowRefStmt,
  isDataProductRefStmt,
  isSendsStmt,
  isReceivesStmt,
  isWritesToStmt,
  isReadsFromStmt,
  isAnnotation,
  isChannelRefStmt,
  isAddressStmt,
  isProtocolStmt,
  isParameterDecl,
  isRouteStmt,
  isServiceRefStmt,
  isDomainRefStmt,
  isContainerRefStmt,
  isContainerTypeStmt,
  isTechnologyStmt,
  isAuthoritativeStmt,
  isAccessModeStmt,
  isClassificationStmt,
  isResidencyStmt,
  isRetentionStmt,
  isInputStmt,
  isOutputStmt,
  isFlowEntryChain,
  isFlowWhenBlock,
  isToClause,
  isFromClause,
} from "./generated/ast.js";
import type {
  Annotation,
  ChannelRefStmt,
  DataProductRefStmt,
  ContainerDef,
  ContainerRefStmt,
  DomainRefStmt,
  FlowEntryChain,
  FlowWhenBlock,
  FlowRefStmt,
  FromClause,
  InputStmt,
  OutputStmt,
  ParameterDecl,
  ReadsFromStmt,
  ReceivesStmt,
  RouteStmt,
  SendsStmt,
  ServiceDef,
  ServiceRefStmt,
  SubdomainDef,
  ToClause,
  WritesToStmt,
} from "./generated/ast.js";

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/**
 * Strip surrounding double-quotes from a STRING terminal value.
 * Langium keeps the quotes in the parsed string – this helper removes them.
 */
export function stripQuotes(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Common body helpers
// ---------------------------------------------------------------------------

/** Return the first VersionStmt value found in `body`, or `undefined`. */
export function getVersion(body: AstNode[]): string | undefined {
  const stmt = body.find(isVersionStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first NameStmt value (quotes stripped) found in `body`, or `undefined`. */
export function getName(body: AstNode[]): string | undefined {
  const stmt = body.find(isNameStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

/** Return the first SummaryStmt value (quotes stripped) found in `body`, or `undefined`. */
export function getSummary(body: AstNode[]): string | undefined {
  const stmt = body.find(isSummaryStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

/** Collect all OwnerStmt `ownerRef` values from `body`. */
export function getOwners(body: AstNode[]): string[] {
  return body.filter(isOwnerStmt).map((s) => s.ownerRef);
}

/** Return the first DeprecatedStmt value found in `body`, or `undefined`. */
export function getDeprecated(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isDeprecatedStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first DraftStmt value found in `body`, or `undefined`. */
export function getDraft(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isDraftStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first LegendStmt value found in `body`, or `undefined`. */
export function getLegend(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isLegendStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first SearchStmt value found in `body`, or `undefined`. */
export function getSearch(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isSearchStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first ToolbarStmt value found in `body`, or `undefined`. */
export function getToolbar(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isToolbarStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first FocusModeStmt value found in `body`, or `undefined`. */
export function getFocusMode(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isFocusModeStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first AnimatedStmt value found in `body`, or `undefined`. */
export function getAnimated(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isAnimatedStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first StyleStmt value found in `body`, or `undefined`. */
export function getStyle(body: AstNode[]): string | undefined {
  const stmt = body.find(isStyleStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first SchemaStmt value (quotes stripped) found in `body`, or `undefined`. */
export function getSchema(body: AstNode[]): string | undefined {
  const stmt = body.find(isSchemaStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

// ---------------------------------------------------------------------------
// Domain body helpers
// ---------------------------------------------------------------------------

/** Return all inline ServiceDef nodes from `body`. */
export function getServices(body: AstNode[]): ServiceDef[] {
  return body.filter(isServiceDef);
}

/** Return all SubdomainDef nodes from `body`. */
export function getSubdomains(body: AstNode[]): SubdomainDef[] {
  return body.filter(isSubdomainDef);
}

/** Return all inline ContainerDef nodes from `body`. */
export function getContainers(body: AstNode[]): ContainerDef[] {
  return body.filter(isContainerDef);
}

/** Return all FlowRefStmt nodes from `body`. */
export function getFlowRefs(body: AstNode[]): FlowRefStmt[] {
  return body.filter(isFlowRefStmt);
}

/** Return all DataProductRefStmt nodes from `body`. */
export function getDataProductRefs(body: AstNode[]): DataProductRefStmt[] {
  return body.filter(isDataProductRefStmt);
}

/** Return all SendsStmt nodes from `body`. */
export function getSends(body: AstNode[]): SendsStmt[] {
  return body.filter(isSendsStmt);
}

/** Return all ReceivesStmt nodes from `body`. */
export function getReceives(body: AstNode[]): ReceivesStmt[] {
  return body.filter(isReceivesStmt);
}

/** Return all Annotation nodes from `body`. */
export function getAnnotations(body: AstNode[]): Annotation[] {
  return body.filter(isAnnotation);
}

// ---------------------------------------------------------------------------
// Service body helpers
// ---------------------------------------------------------------------------

/** Return all WritesToStmt nodes from `body`. */
export function getWritesToRefs(body: AstNode[]): WritesToStmt[] {
  return body.filter(isWritesToStmt);
}

/** Return all ReadsFromStmt nodes from `body`. */
export function getReadsFromRefs(body: AstNode[]): ReadsFromStmt[] {
  return body.filter(isReadsFromStmt);
}

// ---------------------------------------------------------------------------
// Message body helpers
// ---------------------------------------------------------------------------

/** Return all ChannelRefStmt nodes from `body`. */
export function getChannelRefs(body: AstNode[]): ChannelRefStmt[] {
  return body.filter(isChannelRefStmt);
}

// ---------------------------------------------------------------------------
// Channel body helpers
// ---------------------------------------------------------------------------

/** Return the first AddressStmt value (quotes stripped) from `body`, or `undefined`. */
export function getAddress(body: AstNode[]): string | undefined {
  const stmt = body.find(isAddressStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

/** Collect all ProtocolStmt values (quotes stripped) from `body`. */
export function getProtocols(body: AstNode[]): string[] {
  return body.filter(isProtocolStmt).map((s) => stripQuotes(s.value));
}

/** Return all ParameterDecl nodes from `body`. */
export function getParameters(body: AstNode[]): ParameterDecl[] {
  return body.filter(isParameterDecl);
}

/** Return all RouteStmt nodes from `body`. */
export function getRoutes(body: AstNode[]): RouteStmt[] {
  return body.filter(isRouteStmt);
}

// ---------------------------------------------------------------------------
// Relationship helpers
// ---------------------------------------------------------------------------

/** Return all ServiceRefStmt nodes from `body`. */
export function getServiceRefs(body: AstNode[]): ServiceRefStmt[] {
  return body.filter(isServiceRefStmt);
}

/** Return all DomainRefStmt nodes from `body`. */
export function getDomainRefs(body: AstNode[]): DomainRefStmt[] {
  return body.filter(isDomainRefStmt);
}

/** Return all ContainerRefStmt nodes from `body`. */
export function getContainerRefs(body: AstNode[]): ContainerRefStmt[] {
  return body.filter(isContainerRefStmt);
}

// ---------------------------------------------------------------------------
// Container body helpers
// ---------------------------------------------------------------------------

/** Return the first ContainerTypeStmt value from `body`, or `undefined`. */
export function getContainerType(body: AstNode[]): string | undefined {
  const stmt = body.find(isContainerTypeStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first TechnologyStmt value (quotes stripped) from `body`, or `undefined`. */
export function getTechnology(body: AstNode[]): string | undefined {
  const stmt = body.find(isTechnologyStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

/** Return the first AuthoritativeStmt value from `body`, or `undefined`. */
export function getAuthoritative(body: AstNode[]): boolean | undefined {
  const stmt = body.find(isAuthoritativeStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first AccessModeStmt value from `body`, or `undefined`. */
export function getAccessMode(body: AstNode[]): string | undefined {
  const stmt = body.find(isAccessModeStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first ClassificationStmt value from `body`, or `undefined`. */
export function getClassification(body: AstNode[]): string | undefined {
  const stmt = body.find(isClassificationStmt);
  return stmt ? stmt.value : undefined;
}

/** Return the first ResidencyStmt value (quotes stripped) from `body`, or `undefined`. */
export function getResidency(body: AstNode[]): string | undefined {
  const stmt = body.find(isResidencyStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

/** Return the first RetentionStmt value (quotes stripped) from `body`, or `undefined`. */
export function getRetention(body: AstNode[]): string | undefined {
  const stmt = body.find(isRetentionStmt);
  return stmt ? stripQuotes(stmt.value) : undefined;
}

// ---------------------------------------------------------------------------
// Data-product body helpers
// ---------------------------------------------------------------------------

/** Return all InputStmt nodes from `body`. */
export function getInputs(body: AstNode[]): InputStmt[] {
  return body.filter(isInputStmt);
}

/** Return all OutputStmt nodes from `body`. */
export function getOutputs(body: AstNode[]): OutputStmt[] {
  return body.filter(isOutputStmt);
}

// ---------------------------------------------------------------------------
// Flow body helpers
// ---------------------------------------------------------------------------

/** Return all FlowEntryChain nodes from `body`. */
export function getFlowEntryChains(body: AstNode[]): FlowEntryChain[] {
  return body.filter(isFlowEntryChain);
}

/** Return all FlowWhenBlock nodes from `body`. */
export function getFlowWhenBlocks(body: AstNode[]): FlowWhenBlock[] {
  return body.filter(isFlowWhenBlock);
}

// ---------------------------------------------------------------------------
// Sends / Receives body helpers
// ---------------------------------------------------------------------------

/** Return the first ToClause from `body`, or `undefined`. */
export function getToClause(body: AstNode[]): ToClause | undefined {
  return body.find(isToClause) as ToClause | undefined;
}

/** Return the first FromClause from `body`, or `undefined`. */
export function getFromClause(body: AstNode[]): FromClause | undefined {
  return body.find(isFromClause) as FromClause | undefined;
}
