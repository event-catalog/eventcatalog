import yaml from "js-yaml";
import type {
  SpecMessage,
  SpecChannel,
  SpecOperation,
  SpecService,
  ResourceType,
  ResolveError,
  SpecResolveResult,
  FetchFn,
} from "./types.js";

// Matches: import events { OrderCreated } from "./spec.yml"
// Matches: import channels { orderEvents } from "./spec.yml"
// Matches: import events { OrderCreated } from "https://example.com/spec.yml"
const ASYNCAPI_IMPORT_RE =
  /import\s+(events|commands|queries|channels)\s*\{([^}]*)\}\s*from\s*"([^"]+\.ya?ml)"\s*\n?/g;

// Matches: import OrderService from "./spec.yml"
// A bare identifier (no braces, no resource type keyword) imports a full service
const SERVICE_IMPORT_RE =
  /import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s*"([^"]+\.ya?ml)"\s*\n?/g;

const RESOURCE_TYPE_SINGULAR: Record<ResourceType, string> = {
  events: "event",
  commands: "command",
  queries: "query",
  channels: "channel",
};

function resolveRef(doc: any, ref: string): any {
  if (!ref.startsWith("#/")) return null;
  return ref
    .slice(2)
    .split("/")
    .reduce(
      (current, part) =>
        current != null && typeof current === "object" ? current[part] : null,
      doc as any,
    );
}

interface ParsedSpec {
  messages: Map<string, SpecMessage>;
  channels: Map<string, SpecChannel>;
  errors: ResolveError[];
}

/**
 * Parse an AsyncAPI v2 or v3 document and extract both messages and channels.
 */
export function parseSpec(content: string): ParsedSpec {
  let doc: any;
  try {
    doc = yaml.load(content);
  } catch (e) {
    return {
      messages: new Map(),
      channels: new Map(),
      errors: [
        {
          message: `Failed to parse AsyncAPI YAML: ${String(e)}`,
          line: 1,
          column: 1,
        },
      ],
    };
  }

  if (!doc || typeof doc !== "object") {
    return {
      messages: new Map(),
      channels: new Map(),
      errors: [
        { message: "AsyncAPI file is empty or invalid", line: 1, column: 1 },
      ],
    };
  }

  const asyncApiVersion = doc.asyncapi || "";

  const [messages, channels] = asyncApiVersion.startsWith("3.")
    ? [extractV3Messages(doc), extractV3Channels(doc)]
    : asyncApiVersion.startsWith("2.")
      ? [extractV2Messages(doc), extractV2Channels(doc)]
      : [new Map<string, SpecMessage>(), new Map<string, SpecChannel>()];

  // Apply spec-level version to resources that don't have their own
  if (doc.info?.version) {
    const specVersion = doc.info.version;
    for (const msg of messages.values()) {
      if (!msg.version) msg.version = specVersion;
    }
    for (const ch of channels.values()) {
      if (!ch.version) ch.version = specVersion;
    }
  }

  return { messages, channels, errors: [] };
}

/**
 * Extract a full service definition from an AsyncAPI spec.
 * Infers the service name, channels, messages, and send/receive operations.
 */
export function extractService(
  content: string,
  serviceName?: string,
): { service: SpecService; errors: ResolveError[] } {
  const emptyService = (name: string): SpecService => ({
    name,
    operations: [],
    channels: [],
    messages: [],
  });

  const parsed = parseSpec(content);
  if (parsed.errors.length > 0) {
    return {
      service: emptyService(serviceName || "UnknownService"),
      errors: parsed.errors,
    };
  }

  // parseSpec returns empty maps for empty/invalid docs, so check that
  const doc = yaml.load(content) as any;
  if (!doc || typeof doc !== "object") {
    return {
      service: emptyService(serviceName || "UnknownService"),
      errors: [
        { message: "AsyncAPI file is empty or invalid", line: 1, column: 1 },
      ],
    };
  }

  const name =
    serviceName || sanitizeServiceName(doc.info?.title) || "UnknownService";
  const version = doc.info?.version;
  const summary = doc.info?.description?.trim().split("\n")[0];
  const asyncApiVersion = doc.asyncapi || "";

  const operations = asyncApiVersion.startsWith("3.")
    ? extractV3Operations(doc)
    : asyncApiVersion.startsWith("2.")
      ? extractV2Operations(doc)
      : [];

  // Collect channels and messages referenced by operations
  const usedChannelNames = new Set(operations.map((op) => op.channelName));
  const usedMessageNames = new Set(operations.map((op) => op.messageName));

  const channels = [...parsed.channels.values()].filter((ch) =>
    usedChannelNames.has(ch.name),
  );
  const messages = [...parsed.messages.values()].filter((msg) =>
    usedMessageNames.has(msg.name),
  );

  return {
    service: { name, version, summary, operations, channels, messages },
    errors: [],
  };
}

function sanitizeServiceName(title: string | undefined): string | undefined {
  if (!title) return undefined;
  // Remove trailing words like "API", "Service", "Events" if they'd be redundant
  // Then PascalCase the result
  return title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/**
 * Extract messages from an AsyncAPI document.
 * Convenience wrapper around parseSpec for callers that only need messages.
 */
export function extractMessages(content: string): {
  messages: Map<string, SpecMessage>;
  errors: ResolveError[];
} {
  const { messages, errors } = parseSpec(content);
  return { messages, errors };
}

/**
 * Extract channels from an AsyncAPI document.
 * Convenience wrapper around parseSpec for callers that only need channels.
 */
export function extractChannels(content: string): {
  channels: Map<string, SpecChannel>;
  errors: ResolveError[];
} {
  const { channels, errors } = parseSpec(content);
  return { channels, errors };
}

// ─── V3 extractors ──────────────────────────────────────

function extractV3Messages(doc: any): Map<string, SpecMessage> {
  const messages = new Map<string, SpecMessage>();

  if (doc.components?.messages) {
    for (const [name, msg] of Object.entries<any>(doc.components.messages)) {
      messages.set(name, {
        name,
        summary: msg.summary || msg.title,
        description: msg.description,
      });
    }
  }

  if (doc.channels) {
    for (const channel of Object.values<any>(doc.channels)) {
      if (!channel.messages) continue;
      for (const [name, msg] of Object.entries<any>(channel.messages)) {
        if (messages.has(name)) continue;
        const resolved = msg.$ref ? resolveRef(doc, msg.$ref) : msg;
        if (resolved) {
          messages.set(name, {
            name,
            summary: resolved.summary || resolved.title,
            description: resolved.description,
          });
        }
      }
    }
  }

  return messages;
}

function extractV3Channels(doc: any): Map<string, SpecChannel> {
  const channels = new Map<string, SpecChannel>();
  if (!doc.channels) return channels;

  const defaultProtocol = guessProtocol(doc);

  for (const [name, ch] of Object.entries<any>(doc.channels)) {
    channels.set(name, {
      name,
      address: ch.address,
      protocol: getChannelProtocol(ch, doc) || defaultProtocol,
      summary: ch.summary || ch.description || ch.title,
    });
  }

  return channels;
}

function extractV3Operations(doc: any): SpecOperation[] {
  if (!doc.operations) return [];

  const operations: SpecOperation[] = [];

  for (const [, op] of Object.entries<any>(doc.operations)) {
    const action = op.action as "send" | "receive";
    if (!action) continue;

    // Resolve channel reference
    const channelRef = op.channel?.$ref;
    const channelName = channelRef
      ? channelRef.replace("#/channels/", "")
      : undefined;
    if (!channelName) continue;

    // If the operation specifies its own messages, use only those
    const opMessages = resolveV3OperationMessages(op, doc);
    if (opMessages.length > 0) {
      for (const { name, resolved } of opMessages) {
        operations.push({
          action,
          channelName,
          messageName: name,
          summary: resolved?.summary || resolved?.title || op.summary,
        });
      }
      continue;
    }

    // Fall back to all messages on the referenced channel
    const channel = doc.channels?.[channelName];
    if (!channel?.messages) continue;

    for (const [messageName, msg] of Object.entries<any>(channel.messages)) {
      const resolved = msg.$ref ? resolveRef(doc, msg.$ref) : msg;
      operations.push({
        action,
        channelName,
        messageName,
        summary: resolved?.summary || resolved?.title || op.summary,
      });
    }
  }

  return deduplicateOperations(operations);
}

/**
 * Resolve the `messages` array on a v3 operation.
 * Each entry can be a `$ref` to a channel message or a component message.
 */
function resolveV3OperationMessages(
  op: any,
  doc: any,
): { name: string; resolved: any }[] {
  if (!Array.isArray(op.messages) || op.messages.length === 0) return [];

  const results: { name: string; resolved: any }[] = [];
  for (const msgEntry of op.messages) {
    const ref = msgEntry.$ref;
    if (!ref) continue;

    // Refs like "#/channels/orderCreated/messages/OrderCreated"
    const channelMsgMatch = ref.match(
      /^#\/channels\/[^/]+\/messages\/([^/]+)$/,
    );
    if (channelMsgMatch) {
      const resolved = resolveRef(doc, ref);
      const finalResolved = resolved?.$ref
        ? resolveRef(doc, resolved.$ref)
        : resolved;
      results.push({ name: channelMsgMatch[1], resolved: finalResolved });
      continue;
    }

    // Refs like "#/components/messages/OrderCreated"
    const componentMsgMatch = ref.match(/^#\/components\/messages\/([^/]+)$/);
    if (componentMsgMatch) {
      const resolved = resolveRef(doc, ref);
      results.push({ name: componentMsgMatch[1], resolved });
    }
  }
  return results;
}

// ─── V2 extractors ──────────────────────────────────────

function extractV2Messages(doc: any): Map<string, SpecMessage> {
  const messages = new Map<string, SpecMessage>();

  if (doc.components?.messages) {
    for (const [name, msg] of Object.entries<any>(doc.components.messages)) {
      messages.set(name, {
        name,
        summary: msg.summary || msg.title,
        description: msg.description,
      });
    }
  }

  if (doc.channels) {
    for (const channel of Object.values<any>(doc.channels)) {
      for (const op of [channel.publish, channel.subscribe]) {
        const msg = op?.message;
        if (!msg) continue;
        for (const resolved of resolveV2MessageEntries(msg, doc)) {
          if (!messages.has(resolved.name)) {
            messages.set(resolved.name, resolved);
          }
        }
      }
    }
  }

  return messages;
}

function extractV2Channels(doc: any): Map<string, SpecChannel> {
  const channels = new Map<string, SpecChannel>();
  if (!doc.channels) return channels;

  const defaultProtocol = guessProtocol(doc);

  for (const [address, ch] of Object.entries<any>(doc.channels)) {
    const name = address.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
    channels.set(name, {
      name,
      address,
      protocol: ch.bindings ? Object.keys(ch.bindings)[0] : defaultProtocol,
      summary: ch.description || ch.summary,
    });
  }

  return channels;
}

function extractV2Operations(doc: any): SpecOperation[] {
  if (!doc.channels) return [];

  const operations: SpecOperation[] = [];

  for (const [address, ch] of Object.entries<any>(doc.channels)) {
    const channelName = address
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    if (ch.publish?.message) {
      for (const { name, summary } of resolveV2Message(
        ch.publish.message,
        doc,
      )) {
        operations.push({
          action: "send",
          channelName,
          messageName: name,
          summary,
        });
      }
    }

    if (ch.subscribe?.message) {
      for (const { name, summary } of resolveV2Message(
        ch.subscribe.message,
        doc,
      )) {
        operations.push({
          action: "receive",
          channelName,
          messageName: name,
          summary,
        });
      }
    }
  }

  return operations;
}

/**
 * Resolve a v2 message object, handling $ref and oneOf.
 * Returns an array because oneOf can expand to multiple messages.
 */
function resolveV2Message(
  msg: any,
  doc: any,
): { name: string; summary?: string }[] {
  return resolveV2MessageEntries(msg, doc).map(({ name, summary }) => ({
    name,
    summary,
  }));
}

/**
 * Resolve a v2 message to full SpecMessage entries (with description).
 * Handles $ref, oneOf, and name extraction from $ref paths.
 */
function resolveV2MessageEntries(msg: any, doc: any): SpecMessage[] {
  if (!msg) return [];

  // Resolve $ref first
  const resolved = msg.$ref ? resolveRef(doc, msg.$ref) : msg;
  if (!resolved) return [];

  // Handle oneOf: each entry is a separate message
  if (Array.isArray(resolved.oneOf)) {
    return resolved.oneOf.flatMap((entry: any) =>
      resolveV2MessageEntries(entry, doc),
    );
  }

  let name = resolved.name || resolved.messageId;
  if (!name && msg.$ref) {
    // Extract name from $ref path (e.g. "#/components/messages/OrderCreated")
    const refMatch = msg.$ref.match(/\/([^/]+)$/);
    if (refMatch) name = refMatch[1];
  }
  if (!name) return [];

  return [
    {
      name,
      summary: resolved.summary || resolved.title,
      description: resolved.description,
    },
  ];
}

/**
 * Deduplicate operations that reference the same message on the same channel.
 * Can happen when multiple v3 operations point to the same channel+message.
 */
function deduplicateOperations(ops: SpecOperation[]): SpecOperation[] {
  const seen = new Set<string>();
  return ops.filter((op) => {
    const key = `${op.action}:${op.channelName}:${op.messageName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Protocol helpers ───────────────────────────────────

function guessProtocol(doc: any): string | undefined {
  const servers = doc.servers ? Object.values<any>(doc.servers) : [];
  return servers[0]?.protocol;
}

function getChannelProtocol(channel: any, doc: any): string | undefined {
  if (channel.bindings) {
    const protocols = Object.keys(channel.bindings);
    if (protocols.length > 0) return protocols[0];
  }
  if (Array.isArray(channel.servers) && channel.servers.length > 0) {
    const serverRef = channel.servers[0];
    const server = serverRef.$ref ? resolveRef(doc, serverRef.$ref) : serverRef;
    if (server?.protocol) return server.protocol;
  }
  return undefined;
}

// ─── EC code generation ─────────────────────────────────

/**
 * Convert a SpecMessage to an .ec definition string.
 */
export function messageToEc(
  msg: SpecMessage,
  resourceType: ResourceType,
): string {
  return ecBlock(RESOURCE_TYPE_SINGULAR[resourceType], msg.name, [
    msg.version && `version ${msg.version}`,
    msg.summary && `summary "${escapeEc(msg.summary)}"`,
  ]);
}

/**
 * Convert a SpecChannel to an .ec channel definition string.
 */
export function channelToEc(ch: SpecChannel): string {
  return ecBlock("channel", ch.name, [
    ch.version && `version ${ch.version}`,
    ch.address && `address "${escapeEc(ch.address)}"`,
    ch.protocol && `protocol "${escapeEc(ch.protocol)}"`,
    ch.summary && `summary "${escapeEc(ch.summary)}"`,
  ]);
}

/**
 * Convert a SpecService to a full .ec definition string.
 * Generates channel definitions, event definitions, and the service block
 * with sends/receives routed through channels.
 */
export function serviceToEc(service: SpecService): string {
  const parts: string[] = [];

  // Generate channel definitions
  for (const ch of service.channels) {
    parts.push(channelToEc(ch));
  }

  // Build the service block
  const serviceProps: (string | false | undefined | null)[] = [
    service.version && `version ${service.version}`,
    service.summary && `summary "${escapeEc(service.summary)}"`,
  ];

  // Group operations by action for readability
  const sends = service.operations.filter((op) => op.action === "send");
  const receives = service.operations.filter((op) => op.action === "receive");

  // Add blank line before sends/receives if we have version/summary
  if (serviceProps.some(Boolean) && (sends.length > 0 || receives.length > 0)) {
    serviceProps.push("");
  }

  const messageVersions = new Map(
    service.messages.map((m) => [m.name, m.version]),
  );

  for (const op of sends) {
    const version = messageVersions.get(op.messageName);
    const versionSuffix = version ? `@${version}` : "";
    serviceProps.push(
      `sends event ${op.messageName}${versionSuffix} to ${op.channelName}`,
    );
  }

  for (const op of receives) {
    const version = messageVersions.get(op.messageName);
    const versionSuffix = version ? `@${version}` : "";
    serviceProps.push(
      `receives event ${op.messageName}${versionSuffix} from ${op.channelName}`,
    );
  }

  parts.push(ecBlock("service", service.name, serviceProps));

  return parts.join("\n\n");
}

function ecBlock(
  keyword: string,
  name: string,
  props: (string | false | undefined | null)[],
): string {
  const body = props.filter(
    (p) => p !== false && p !== undefined && p !== null,
  ) as string[];
  const indented = body.map((line) => (line === "" ? "" : `  ${line}`));
  return [`${keyword} ${name} {`, ...indented, "}"].join("\n");
}

function escapeEc(value: string): string {
  return value.replace(/"/g, '\\"');
}

// ─── Import resolution ──────────────────────────────────

function isUrl(path: string): boolean {
  return path.startsWith("https://") || path.startsWith("http://");
}

interface ImportMatch {
  full: string;
  resourceType: ResourceType;
  importNames: string[];
  specPath: string;
}

interface ServiceImportMatch {
  full: string;
  serviceName: string;
  specPath: string;
}

function findImports(source: string): ImportMatch[] {
  const imports: ImportMatch[] = [];
  ASYNCAPI_IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = ASYNCAPI_IMPORT_RE.exec(source)) !== null) {
    imports.push({
      full: match[0],
      resourceType: match[1] as ResourceType,
      importNames: match[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      specPath: match[3],
    });
  }
  return imports;
}

function findServiceImports(source: string): ServiceImportMatch[] {
  const imports: ServiceImportMatch[] = [];
  SERVICE_IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = SERVICE_IMPORT_RE.exec(source)) !== null) {
    imports.push({
      full: match[0],
      serviceName: match[1],
      specPath: match[2],
    });
  }
  return imports;
}

interface ImportResolution {
  ec: string;
  errors: ResolveError[];
}

function resolveImportToEc(
  imp: ImportMatch,
  parsed: ParsedSpec,
): ImportResolution {
  const errors: ResolveError[] = [];

  const isChannelImport = imp.resourceType === "channels";
  const catalog = isChannelImport ? parsed.channels : parsed.messages;
  const typeName = isChannelImport ? "Channel" : "Message";

  const ecDefs = imp.importNames.map((name) => {
    const resource = catalog.get(name);
    if (!resource) {
      errors.push({
        message: `${typeName} "${name}" not found in AsyncAPI spec "${imp.specPath}". Available: ${[...catalog.keys()].join(", ") || "(none)"}`,
        line: 1,
        column: 1,
      });
      return `// ERROR: "${name}" not found in ${imp.specPath}`;
    }
    return isChannelImport
      ? channelToEc(resource as SpecChannel)
      : messageToEc(resource as SpecMessage, imp.resourceType);
  });

  return { ec: ecDefs.join("\n\n"), errors };
}

function resolveServiceImportToEc(
  imp: ServiceImportMatch,
  specContent: string,
): ImportResolution {
  const { service, errors } = extractService(specContent, imp.serviceName);
  return { ec: serviceToEc(service), errors };
}

function lookupLocalSpec(
  specPath: string,
  files: Record<string, string>,
): string | undefined {
  const normalizedPath = specPath.replace(/^\.\//, "");
  return (
    files[specPath] ?? files[normalizedPath] ?? files[`./${normalizedPath}`]
  );
}

function isYamlFile(filename: string): boolean {
  return filename.endsWith(".yml") || filename.endsWith(".yaml");
}

const SKIP = Symbol("skip");
type SpecLookup = (specPath: string) => string | typeof SKIP | undefined;

/**
 * Core resolution logic shared by sync and async resolvers.
 * Given a spec content lookup function, resolves all imports in .ec files.
 * Return `SKIP` from the callback to leave an import untouched;
 * return `undefined` to replace it with an error comment.
 */
function resolveFileImports(
  files: Record<string, string>,
  getSpecContent: SpecLookup,
): SpecResolveResult {
  const errors: ResolveError[] = [];
  const newFiles: Record<string, string> = {};
  const parsedSpecs = new Map<string, ParsedSpec>();

  for (const [filename, source] of Object.entries(files)) {
    if (isYamlFile(filename)) continue;

    const imports = findImports(source);
    const serviceImports = findServiceImports(source);

    if (imports.length === 0 && serviceImports.length === 0) {
      newFiles[filename] = source;
      continue;
    }

    let result = source;

    // Resolve resource imports (import events { ... } from "spec.yml")
    for (const imp of imports) {
      const specContent = getSpecContent(imp.specPath);
      if (specContent === SKIP) continue;
      if (!specContent) {
        result = result.replace(
          imp.full,
          `// ERROR: AsyncAPI spec not available: ${imp.specPath}`,
        );
        continue;
      }

      const cacheKey = isUrl(imp.specPath)
        ? imp.specPath
        : imp.specPath.replace(/^\.\//, "");

      if (!parsedSpecs.has(cacheKey)) {
        const parsed = parseSpec(specContent);
        parsedSpecs.set(cacheKey, parsed);
        errors.push(...parsed.errors);
      }
      const parsed = parsedSpecs.get(cacheKey)!;

      const resolution = resolveImportToEc(imp, parsed);
      errors.push(...resolution.errors);
      result = result.replace(imp.full, resolution.ec);
    }

    // Resolve service imports (import ServiceName from "spec.yml")
    for (const imp of serviceImports) {
      const specContent = getSpecContent(imp.specPath);
      if (specContent === SKIP) continue;
      if (!specContent) {
        result = result.replace(
          imp.full,
          `// ERROR: AsyncAPI spec not available: ${imp.specPath}`,
        );
        continue;
      }

      const resolution = resolveServiceImportToEc(imp, specContent);
      errors.push(...resolution.errors);
      result = result.replace(imp.full, resolution.ec);
    }

    newFiles[filename] = result;
  }

  return { files: newFiles, errors };
}

/**
 * Resolve all AsyncAPI imports in a set of files (sync, local files only).
 * Scans .ec files for `import <type> { ... } from "*.yml"` and
 * `import ServiceName from "*.yml"` statements, parses the referenced
 * YAML files, and replaces the imports with synthesized .ec definitions.
 * YAML files are excluded from the output.
 * URL imports are left untouched - use resolveImportsAsync for those.
 */
export function resolveImports(
  files: Record<string, string>,
): SpecResolveResult {
  const notFoundErrors: ResolveError[] = [];

  const result = resolveFileImports(files, (specPath) => {
    if (isUrl(specPath)) return SKIP;
    const content = lookupLocalSpec(specPath, files);
    if (!content) {
      notFoundErrors.push({
        message: `AsyncAPI file not found: "${specPath}"`,
        line: 1,
        column: 1,
      });
    }
    return content;
  });

  return {
    files: result.files,
    errors: [...notFoundErrors, ...result.errors],
  };
}

/**
 * Resolve all AsyncAPI imports including remote URLs (async).
 * Fetches remote specs via the provided fetchFn, then resolves all imports.
 * For local file imports, looks them up in the files map.
 */
export async function resolveImportsAsync(
  files: Record<string, string>,
  fetchFn: FetchFn,
): Promise<SpecResolveResult> {
  // Collect all unique remote URLs that need fetching
  const urlsToFetch = new Set<string>();
  for (const [filename, source] of Object.entries(files)) {
    if (isYamlFile(filename)) continue;
    for (const imp of findImports(source)) {
      if (isUrl(imp.specPath)) urlsToFetch.add(imp.specPath);
    }
    for (const imp of findServiceImports(source)) {
      if (isUrl(imp.specPath)) urlsToFetch.add(imp.specPath);
    }
  }

  // Fetch all remote specs in parallel
  const fetchErrors: ResolveError[] = [];
  const fetchedSpecs = new Map<string, string>();
  await Promise.all(
    [...urlsToFetch].map(async (url) => {
      try {
        fetchedSpecs.set(url, await fetchFn(url));
      } catch (err) {
        fetchErrors.push({
          message: `Failed to fetch AsyncAPI spec "${url}": ${String(err)}`,
          line: 1,
          column: 1,
        });
      }
    }),
  );

  const notFoundErrors: ResolveError[] = [];

  const result = resolveFileImports(files, (specPath) => {
    if (isUrl(specPath)) return fetchedSpecs.get(specPath);
    const content = lookupLocalSpec(specPath, files);
    if (!content) {
      notFoundErrors.push({
        message: `AsyncAPI file not found: "${specPath}"`,
        line: 1,
        column: 1,
      });
    }
    return content;
  });

  return {
    files: result.files,
    errors: [...fetchErrors, ...notFoundErrors, ...result.errors],
  };
}
