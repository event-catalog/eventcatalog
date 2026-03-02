/**
 * Shared resource index: resolves resource names to their definitions
 * across all workspace .ec documents. Used by both DefinitionProvider and HoverProvider.
 */
import type { AstNode, LangiumDocument } from "langium";
import type { LangiumServices } from "langium/lsp";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSpecAuto } from "./completion-utils.js";
import { isSpecFile } from "./resolvers/resolve.js";
import { stripQuotes } from "./ast-utils.js";
import { RESOURCE_TYPE_SINGULAR } from "./resolvers/asyncapi.js";
import {
  isProgram,
  isSendsStmt,
  isReceivesStmt,
  isWritesToStmt,
  isReadsFromStmt,
  isServiceRefStmt,
  isDomainRefStmt,
  isFlowRefStmt,
  isDataProductRefStmt,
  isContainerRefStmt,
  isEventRefStmt,
  isCommandRefStmt,
  isQueryRefStmt,
  isOwnerStmt,
  isTeamMemberProp,
  isInputStmt,
  isResourceRef,
  isVersionedResourceRef,
  isEventDef,
  isCommandDef,
  isQueryDef,
  isServiceDef,
  isDomainDef,
  isChannelDef,
  isContainerDef,
  isDataProductDef,
  isFlowDef,
  isUserDef,
  isTeamDef,
  isActorDef,
  isExternalSystemDef,
  isSubdomainDef,
  isVisualizerDef,
  isVersionStmt,
  isSummaryStmt,
  isNameStmt,
  isDeprecatedStmt,
  isDraftStmt,
} from "./generated/ast.js";
import type {
  EventDef,
  CommandDef,
  QueryDef,
  ServiceDef,
  DomainDef,
  ChannelDef,
  ContainerDef,
  DataProductDef,
  FlowDef,
  UserDef,
  TeamDef,
  ActorDef,
  ExternalSystemDef,
  SubdomainDef,
  ImportDecl,
  Program,
} from "./generated/ast.js";

/** A resolved resource definition with its containing document. */
export interface ResolvedResource {
  node: AstNode;
  document: LangiumDocument;
  resourceType: string;
  name: string;
  /** For spec-imported resources: metadata from the spec file */
  specInfo?: SpecImportInfo;
}

/** Info about a resource imported from a spec file (OpenAPI/AsyncAPI). */
interface SpecImportInfo {
  specPath: string;
  summary?: string;
  version?: string;
  description?: string;
  method?: string;
  path?: string;
}

/** Info extracted from a resource reference at the cursor. */
export interface ResourceReference {
  name: string;
  resourceType?: string; // e.g., "event", "service", "container"
}

// ─── Resource type from AST $type ──────────────────────

type ResourceDefNode =
  | EventDef
  | CommandDef
  | QueryDef
  | ServiceDef
  | DomainDef
  | SubdomainDef
  | ChannelDef
  | ContainerDef
  | DataProductDef
  | FlowDef
  | UserDef
  | TeamDef
  | ActorDef
  | ExternalSystemDef;

const DEF_TYPE_MAP: Record<string, string> = {
  EventDef: "event",
  CommandDef: "command",
  QueryDef: "query",
  ServiceDef: "service",
  DomainDef: "domain",
  SubdomainDef: "subdomain",
  ChannelDef: "channel",
  ContainerDef: "container",
  DataProductDef: "data-product",
  FlowDef: "flow",
  UserDef: "user",
  TeamDef: "team",
  ActorDef: "actor",
  ExternalSystemDef: "external-system",
};

function isResourceDef(node: AstNode): node is ResourceDefNode {
  return node.$type in DEF_TYPE_MAP;
}

// ─── Extract reference info from an AST node ──────────

/**
 * Given an AST node, determine if it represents (or contains) a resource reference.
 * Returns the referenced name + type, or undefined if not a reference context.
 */
export function extractReference(node: AstNode): ResourceReference | undefined {
  if (isSendsStmt(node)) {
    return { name: node.messageName, resourceType: node.messageType };
  }
  if (isReceivesStmt(node)) {
    return { name: node.messageName, resourceType: node.messageType };
  }
  if (isWritesToStmt(node)) {
    return { name: node.ref.name, resourceType: "container" };
  }
  if (isReadsFromStmt(node)) {
    return { name: node.ref.name, resourceType: "container" };
  }
  if (isServiceRefStmt(node)) {
    return { name: node.ref.name, resourceType: "service" };
  }
  if (isDomainRefStmt(node)) {
    return { name: node.ref.name, resourceType: "domain" };
  }
  if (isFlowRefStmt(node)) {
    return { name: node.ref.name, resourceType: "flow" };
  }
  if (isDataProductRefStmt(node)) {
    return { name: node.ref.name, resourceType: "data-product" };
  }
  if (isContainerRefStmt(node)) {
    return { name: node.ref.name, resourceType: "container" };
  }
  if (isEventRefStmt(node)) {
    return { name: node.ref.name, resourceType: "event" };
  }
  if (isCommandRefStmt(node)) {
    return { name: node.ref.name, resourceType: "command" };
  }
  if (isQueryRefStmt(node)) {
    return { name: node.ref.name, resourceType: "query" };
  }
  if (isOwnerStmt(node)) {
    return { name: node.ownerRef };
  }
  if (isTeamMemberProp(node)) {
    return { name: node.memberRef };
  }
  if (isInputStmt(node)) {
    return { name: node.ref.name, resourceType: node.type };
  }
  // ResourceRef / VersionedResourceRef — check parent context
  if (isResourceRef(node) || isVersionedResourceRef(node)) {
    const parent = node.$container;
    if (parent) {
      const parentRef = extractReference(parent);
      if (parentRef) return parentRef;
    }
    return { name: node.name };
  }
  // Check if it's a resource definition itself
  if (isResourceDef(node)) {
    return { name: node.name, resourceType: DEF_TYPE_MAP[node.$type] };
  }
  return undefined;
}

// ─── Find resource definitions across workspace ───────

/**
 * Collect all resource definitions from all .ec documents in the workspace.
 */
function collectDefinitions(services: LangiumServices): ResolvedResource[] {
  const results: ResolvedResource[] = [];
  const docs = services.shared.workspace.LangiumDocuments.all;

  for (const doc of docs) {
    if (!doc.uri.path.endsWith(".ec")) continue;
    const root = doc.parseResult?.value;
    if (!isProgram(root)) continue;
    collectFromProgram(root, doc, results);
  }
  return results;
}

function collectFromProgram(
  program: Program,
  doc: LangiumDocument,
  results: ResolvedResource[],
): void {
  // Collect DSL-defined resources
  for (const def of program.definitions) {
    if (isVisualizerDef(def)) {
      for (const item of def.body) {
        collectFromNode(item as AstNode, doc, results);
      }
    } else {
      collectFromNode(def, doc, results);
    }
  }

  // Collect resources from import declarations (spec files)
  for (const imp of program.imports) {
    collectFromImport(imp, doc, results);
  }
}

function collectFromImport(
  imp: ImportDecl,
  doc: LangiumDocument,
  results: ResolvedResource[],
): void {
  const specPath = stripQuotes(imp.path);
  if (!isSpecFile(specPath)) return;

  const resourceType = imp.resourceType
    ? RESOURCE_TYPE_SINGULAR[imp.resourceType]
    : undefined;

  // Read and parse the spec file
  let specContent: string;
  try {
    const docPath = fileURLToPath(doc.uri.toString());
    const fullPath = resolve(dirname(docPath), specPath);
    specContent = readFileSync(fullPath, "utf-8");
  } catch {
    return;
  }

  try {
    const parsed = parseSpecAuto(specContent);

    // Build a lookup of spec resources by name
    const specResources = new Map<
      string,
      {
        summary?: string;
        version?: string;
        description?: string;
        method?: string;
        path?: string;
      }
    >();
    for (const [name, msg] of parsed.messages) {
      specResources.set(name, msg);
    }
    for (const [name, ch] of parsed.channels) {
      specResources.set(name, ch);
    }

    // Create a ResolvedResource for each imported name
    for (const item of imp.imports) {
      const specMsg = specResources.get(item.name);
      results.push({
        node: item, // The ImportItem AST node
        document: doc,
        resourceType: resourceType || "event",
        name: item.name,
        specInfo: {
          specPath,
          summary: specMsg?.summary,
          version: specMsg?.version,
          description: specMsg?.description,
          method: specMsg && "method" in specMsg ? specMsg.method : undefined,
          path: specMsg && "path" in specMsg ? specMsg.path : undefined,
        },
      });
    }
  } catch {
    // Spec parsing failed — still register the imported names without metadata
    for (const item of imp.imports) {
      results.push({
        node: item,
        document: doc,
        resourceType: resourceType || "event",
        name: item.name,
        specInfo: { specPath },
      });
    }
  }
}

function collectFromNode(
  node: AstNode,
  doc: LangiumDocument,
  results: ResolvedResource[],
): void {
  if (!isResourceDef(node)) return;
  const resourceType = DEF_TYPE_MAP[node.$type];
  results.push({ node, document: doc, resourceType, name: node.name });

  // Recurse into nested definitions (domain → subdomain, etc.)
  if (isDomainDef(node) || isSubdomainDef(node)) {
    for (const item of node.body) {
      collectFromNode(item as AstNode, doc, results);
    }
  }
}

/**
 * Find a resource definition by name and optional type.
 */
export function findResourceDefinition(
  services: LangiumServices,
  name: string,
  resourceType?: string,
): ResolvedResource | undefined {
  const defs = collectDefinitions(services);
  // Prefer exact type match
  if (resourceType) {
    const exact = defs.find(
      (d) => d.name === name && d.resourceType === resourceType,
    );
    if (exact) return exact;
  }
  // Fall back to name-only match
  return defs.find((d) => d.name === name);
}

// ─── Extract metadata from a resource definition ──────

export interface ResourceInfo {
  resourceType: string;
  name: string;
  displayName?: string;
  version?: string;
  summary?: string;
  owner?: string;
  deprecated?: boolean;
  draft?: boolean;
  /** Source spec file for imported resources */
  specPath?: string;
  /** HTTP method (OpenAPI imports) */
  method?: string;
  /** API path (OpenAPI imports) */
  apiPath?: string;
}

/**
 * Extract human-readable info from a resource definition AST node.
 */
export function extractResourceInfo(resolved: ResolvedResource): ResourceInfo {
  const info: ResourceInfo = {
    resourceType: resolved.resourceType,
    name: resolved.name,
  };

  // Spec-imported resources: use metadata from the spec file
  if (resolved.specInfo) {
    info.specPath = resolved.specInfo.specPath;
    info.summary = resolved.specInfo.summary;
    info.version = resolved.specInfo.version;
    info.method = resolved.specInfo.method;
    info.apiPath = resolved.specInfo.path;
    return info;
  }

  const node = resolved.node;
  // Get body items — most defs have `body`, User/Team have `props`
  let items: AstNode[] = [];
  if ("body" in node && Array.isArray(node.body)) {
    items = node.body;
  } else if ("props" in node && Array.isArray(node.props)) {
    items = node.props;
  }

  for (const item of items) {
    if (isVersionStmt(item)) info.version = item.value;
    else if (isSummaryStmt(item)) info.summary = stripQuotes(item.value);
    else if (isOwnerStmt(item)) info.owner = item.ownerRef;
    else if (isNameStmt(item)) info.displayName = stripQuotes(item.value);
    else if (isDeprecatedStmt(item) && item.value) info.deprecated = true;
    else if (isDraftStmt(item) && item.value) info.draft = true;
  }

  return info;
}

/**
 * Format resource info as a markdown hover tooltip.
 */
export function formatResourceHover(info: ResourceInfo): string {
  const lines: string[] = [];

  const label = info.displayName || info.name;
  lines.push(`**${info.resourceType}** ${label}`);

  if (info.deprecated) lines.push("\n\n*deprecated*");
  if (info.draft) lines.push("\n\n*draft*");
  if (info.method && info.apiPath)
    lines.push(`\n\n\`${info.method.toUpperCase()} ${info.apiPath}\``);
  if (info.version) lines.push(`\n\n**Version:** ${info.version}`);
  if (info.summary) lines.push(`\n\n**Summary:** ${info.summary}`);
  if (info.owner) lines.push(`\n\n**Owner:** ${info.owner}`);
  if (info.specPath) lines.push(`\n\n*from ${info.specPath}*`);

  return lines.join("");
}
