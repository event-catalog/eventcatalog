import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import matter from 'gray-matter';
import createSDK from '@eventcatalog/sdk';

export interface ImportOptions {
  files?: string[];
  stdin?: boolean;
  dryRun?: boolean;
  flat?: boolean;
  noInit?: boolean;
  dir: string;
}

interface ParsedResource {
  type: string;
  id: string;
  version?: string;
  frontmatter: Record<string, any>;
  markdown: string;
  path: string;
}

interface ImportResult {
  created: string[];
  updated: string[];
  versioned: string[];
  errors: string[];
}

function normalizeImportedFrontmatter(type: string, frontmatter: Record<string, any>): Record<string, any> {
  const normalized = { ...frontmatter };

  // SDK/container schema uses snake_case fields.
  if (type === 'container') {
    if (normalized.container_type === undefined && normalized.containerType !== undefined) {
      normalized.container_type = normalized.containerType;
      delete normalized.containerType;
    }
    if (normalized.access_mode === undefined && normalized.accessMode !== undefined) {
      normalized.access_mode = normalized.accessMode;
      delete normalized.accessMode;
    }
  }

  return normalized;
}

const RESOURCE_TYPE_FROM_FOLDER: Record<string, string> = {
  events: 'event',
  commands: 'command',
  queries: 'query',
  services: 'service',
  domains: 'domain',
  channels: 'channel',
  flows: 'flow',
  containers: 'container',
  'data-products': 'dataProduct',
  diagrams: 'diagram',
  users: 'user',
  teams: 'team',
};

async function parseDSL(
  source: string,
  options?: { nested?: boolean }
): Promise<{ outputs: { path: string; content: string }[]; program: any }> {
  const { createEcServices, compile } = await import('@eventcatalog/language-server');
  const { EmptyFileSystem, URI } = await import('langium');

  const services = createEcServices(EmptyFileSystem);
  const uri = URI.parse(`file:///import-${Date.now()}.ec`);
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(source, uri);
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document]);

  const parserErrors = document.parseResult.parserErrors;
  if (parserErrors.length > 0) {
    const messages = parserErrors.map((e: any) => `  Line ${e.token?.startLine ?? '?'}: ${e.message}`);
    throw new Error(`Parse errors:\n${messages.join('\n')}`);
  }

  const program = document.parseResult.value;
  const outputs = compile(program, { nested: options?.nested });

  try {
    services.shared.workspace.LangiumDocuments.deleteDocument(uri);
  } catch {
    // Ignore cleanup errors
  }

  return { outputs, program };
}

/**
 * Extract the resource type folder from a path that may be nested.
 * e.g. "events/OrderCreated/..." → "events"
 * e.g. "domains/Payment/services/OrderService/..." → "services"
 * e.g. "domains/Payment/services/OrderService/events/X/..." → "events"
 * e.g. "users/jdoe.md" → "users"
 *
 * Walk the segments and return the last known resource-type folder.
 */
function extractResourceTypeFolder(path: string): string {
  const segments = path.split('/');
  let lastTypeFolder = segments[0];
  for (const seg of segments) {
    if (RESOURCE_TYPE_FROM_FOLDER[seg]) {
      lastTypeFolder = seg;
    }
  }
  return lastTypeFolder;
}

function parseCompiledOutput(output: { path: string; content: string }): ParsedResource {
  const { data: frontmatter, content: markdown } = matter(output.content);

  const typeFolder = extractResourceTypeFolder(output.path);
  const type = RESOURCE_TYPE_FROM_FOLDER[typeFolder] || typeFolder;

  return {
    type,
    id: frontmatter.id,
    version: frontmatter.version,
    frontmatter,
    markdown: markdown.trim(),
    path: output.path,
  };
}

const MESSAGE_TYPE_FOLDER: Record<string, string> = {
  event: 'events',
  command: 'commands',
  query: 'queries',
  channel: 'channels',
};

const DEFAULT_STUB_VERSION = '0.0.1';
const NO_VERSION_KEY = '__no_version__';

function getResourceNameKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function getResourceVersionKey(type: string, id: string, version?: string): string {
  return `${type}:${id}@${version || NO_VERSION_KEY}`;
}

function hasReferenceStatements(source: string): boolean {
  return /\b(?:sends|receives|writes-to|reads-from)\b/.test(source);
}

/**
 * Extract resource stubs from service references that weren't compiled as standalone resources.
 * Uses the DSL AST to determine message types accurately.
 */
async function extractMessageStubs(program: any, compiledIds: Set<string>, nested: boolean = false): Promise<ParsedResource[]> {
  const stubs: ParsedResource[] = [];
  const stubIds = new Set<string>();

  function processDefinitions(definitions: any[], parentPath: string = '') {
    for (const def of definitions) {
      // Handle visualizer wrappers
      if (def.$type === 'VisualizerDef' && def.body) {
        processDefinitions(def.body, parentPath);
        continue;
      }

      // Handle domains — recurse into their services with domain parentPath
      if (def.$type === 'DomainDef') {
        const domainPath = nested ? `domains/${def.name}` : '';
        const domainBody = def.body || [];

        // Process services inside the domain
        const domainServices = domainBody.filter((d: any) => d.$type === 'ServiceDef');
        processDefinitions(domainServices, domainPath);

        // Process subdomains
        const subdomains = domainBody.filter((d: any) => d.$type === 'SubdomainDef');
        for (const sub of subdomains) {
          const subPath = nested ? `domains/${def.name}/subdomains/${sub.name}` : '';
          const subServices = (sub.body || []).filter((d: any) => d.$type === 'ServiceDef');
          processDefinitions(subServices, subPath);
        }
        continue;
      }

      if (def.$type !== 'ServiceDef') continue;

      const servicePath = nested ? (parentPath ? `${parentPath}/services/${def.name}` : `services/${def.name}`) : '';

      const body = def.body || [];
      for (const stmt of body) {
        if (stmt.$type === 'SendsStmt' || stmt.$type === 'ReceivesStmt') {
          const msgType = stmt.messageType; // 'event', 'command', or 'query'
          const msgName = stmt.messageName;
          const hasBody = stmt.body && stmt.body.length > 0;
          const version = stmt.version || DEFAULT_STUB_VERSION;

          if (!hasBody) {
            const folder = MESSAGE_TYPE_FOLDER[msgType];
            if (folder) {
              const key = getResourceVersionKey(msgType, msgName, version);
              const anyVersionKey = getResourceNameKey(msgType, msgName);

              // For explicit refs (e.g. Event@2.0.0), require exact version match.
              // For unversioned refs, treat any compiled version as satisfying the reference.
              if (!compiledIds.has(key) && !stubIds.has(key) && !(!stmt.version && compiledIds.has(anyVersionKey))) {
                const stubFolder = nested && servicePath ? `${servicePath}/${folder}` : folder;

                stubIds.add(key);
                stubs.push({
                  type: msgType,
                  id: msgName,
                  version,
                  frontmatter: {
                    id: msgName,
                    name: msgName,
                    version,
                  },
                  markdown: '',
                  path: `${stubFolder}/${msgName}/versioned/${version}/index.md`,
                });
              }
            }
          }

          // Create channel stubs for to/from references
          if (stmt.channelClause) {
            const channels = stmt.channelClause.channels || [];
            for (const ch of channels) {
              const chName = ch.channelName;
              const chVersion = ch.channelVersion || DEFAULT_STUB_VERSION;
              const chKey = getResourceVersionKey('channel', chName, chVersion);
              const chAnyVersionKey = getResourceNameKey('channel', chName);
              if (compiledIds.has(chKey) || stubIds.has(chKey)) continue;
              if (!ch.channelVersion && compiledIds.has(chAnyVersionKey)) continue;

              const chFolder = nested && parentPath ? `${parentPath}/channels` : 'channels';
              stubIds.add(chKey);
              stubs.push({
                type: 'channel',
                id: chName,
                version: chVersion,
                frontmatter: {
                  id: chName,
                  name: chName,
                  version: chVersion,
                },
                markdown: '',
                path: `${chFolder}/${chName}/versioned/${chVersion}/index.md`,
              });
            }
          }
          continue;
        }

        if (stmt.$type === 'WritesToStmt' || stmt.$type === 'ReadsFromStmt') {
          const containerName = stmt.ref?.name;
          if (!containerName) continue;

          const containerVersion = stmt.ref?.version || DEFAULT_STUB_VERSION;
          const containerKey = getResourceVersionKey('container', containerName, containerVersion);
          const containerAnyVersionKey = getResourceNameKey('container', containerName);
          if (compiledIds.has(containerKey) || stubIds.has(containerKey)) continue;
          if (!stmt.ref?.version && compiledIds.has(containerAnyVersionKey)) continue;

          const containerFolder = nested && parentPath ? `${parentPath}/containers` : 'containers';
          stubIds.add(containerKey);
          stubs.push({
            type: 'container',
            id: containerName,
            version: containerVersion,
            frontmatter: {
              id: containerName,
              name: containerName,
              version: containerVersion,
            },
            markdown: '',
            path: `${containerFolder}/${containerName}/versioned/${containerVersion}/index.md`,
          });
        }
      }
    }
  }

  processDefinitions(program.definitions);

  return stubs;
}

function getVersionFromBody(body: any[] | undefined): string | undefined {
  if (!body) return undefined;
  const versionStmt = body.find((stmt) => stmt?.$type === 'VersionStmt');
  return versionStmt?.value;
}

function buildServiceOutputPath(serviceName: string, body: any[] | undefined, nested: boolean, parentPath: string): string {
  const folder = nested && parentPath ? `${parentPath}/services` : 'services';
  const version = getVersionFromBody(body);
  if (version) return `${folder}/${serviceName}/versioned/${version}/index.md`;
  return `${folder}/${serviceName}/index.md`;
}

function extractServiceContainerRefs(
  program: any,
  nested: boolean = false
): Map<string, { writesTo?: Array<{ id: string; version?: string }>; readsFrom?: Array<{ id: string; version?: string }> }> {
  const refsByPath = new Map<
    string,
    { writesTo?: Array<{ id: string; version?: string }>; readsFrom?: Array<{ id: string; version?: string }> }
  >();

  function processDefinitions(definitions: any[], parentPath: string = ''): void {
    for (const def of definitions || []) {
      if (def.$type === 'VisualizerDef' && def.body) {
        processDefinitions(def.body, parentPath);
        continue;
      }

      if (def.$type === 'DomainDef') {
        const domainPath = nested ? `domains/${def.name}` : '';
        const domainBody = def.body || [];
        const domainServices = domainBody.filter((d: any) => d.$type === 'ServiceDef');
        processDefinitions(domainServices, domainPath);

        const subdomains = domainBody.filter((d: any) => d.$type === 'SubdomainDef');
        for (const sub of subdomains) {
          const subPath = nested ? `domains/${def.name}/subdomains/${sub.name}` : '';
          const subServices = (sub.body || []).filter((d: any) => d.$type === 'ServiceDef');
          processDefinitions(subServices, subPath);
        }
        continue;
      }

      if (def.$type !== 'ServiceDef') continue;

      const body = def.body || [];
      const writesTo = body
        .filter((stmt: any) => stmt.$type === 'WritesToStmt' && stmt.ref?.name)
        .map((stmt: any) => ({
          id: stmt.ref.name,
          ...(stmt.ref.version ? { version: stmt.ref.version } : {}),
        }));

      const readsFrom = body
        .filter((stmt: any) => stmt.$type === 'ReadsFromStmt' && stmt.ref?.name)
        .map((stmt: any) => ({
          id: stmt.ref.name,
          ...(stmt.ref.version ? { version: stmt.ref.version } : {}),
        }));

      if (writesTo.length === 0 && readsFrom.length === 0) continue;

      const path = buildServiceOutputPath(def.name, body, nested, parentPath);
      refsByPath.set(path, {
        ...(writesTo.length > 0 ? { writesTo } : {}),
        ...(readsFrom.length > 0 ? { readsFrom } : {}),
      });
    }
  }

  processDefinitions(program.definitions || []);
  return refsByPath;
}

/**
 * Map resource type to the base folder used by the SDK writer.
 * The SDK creates writers with type-prefixed directories, e.g.
 *   writeService → catalogDir/services/
 *   writeEvent → catalogDir/events/
 * So any custom path must be relative to that base.
 */
const SDK_WRITER_BASE: Record<string, string> = {
  event: 'events',
  command: 'commands',
  query: 'queries',
  service: 'services',
  domain: 'domains',
  channel: 'channels',
  container: 'containers',
  dataProduct: 'data-products',
  diagram: 'diagrams',
  team: 'teams',
  user: 'users',
};

/**
 * Extract the SDK-compatible path option from a compiler output path.
 * The SDK writer already prefixes with the type folder, so we need to
 * return a path relative to that base.
 *
 * e.g. for type "service":
 *   "services/OrderService/versioned/1.0.0/index.md" → "" (default behavior)
 *   "domains/Payment/services/OrderService/versioned/1.0.0/index.md"
 *     → "../domains/Payment/services/OrderService"
 *
 * Returns empty string when the resource is at its default location.
 */
function extractSdkPath(compiledPath: string, resourceType: string): string {
  // Strip versioned/X/index.md or index.md or .md suffix
  const dirPath = compiledPath
    .replace(/\/versioned\/[^/]+\/index\.md$/, '')
    .replace(/\/index\.md$/, '')
    .replace(/\.md$/, '');

  const baseFolder = SDK_WRITER_BASE[resourceType];
  if (!baseFolder) return '';

  // If path starts with the type's default folder, strip it
  // e.g. "services/OrderService" → "OrderService" (default SDK behavior handles this)
  if (dirPath.startsWith(`${baseFolder}/`)) {
    const relative = dirPath.slice(baseFolder.length + 1);
    // If it's just the resource name (no nesting), return empty to use default
    if (!relative.includes('/')) return '';
    return relative;
  }

  // Path is nested under a different folder (e.g. domains/X/services/Y)
  // Need to go up one level from the SDK writer's base directory
  return `../${dirPath}`;
}

const TYPES_WITH_NODE_GRAPH = new Set(['event', 'command', 'query', 'service', 'domain', 'channel', 'flow']);

type SDK = ReturnType<typeof createSDK>;

function getWriter(sdk: SDK, type: string): ((resource: any, options?: any) => Promise<void>) | null {
  switch (type) {
    case 'event':
      return sdk.writeEvent;
    case 'command':
      return sdk.writeCommand;
    case 'query':
      return sdk.writeQuery;
    case 'service':
      return sdk.writeService;
    case 'domain':
      return sdk.writeDomain;
    case 'channel':
      return sdk.writeChannel;
    case 'container':
      return sdk.writeDataStore;
    case 'dataProduct':
      return sdk.writeDataProduct;
    case 'diagram':
      return sdk.writeDiagram;
    case 'team':
      return sdk.writeTeam;
    case 'user':
      return sdk.writeUser;
    default:
      return null;
  }
}

function getReader(sdk: SDK, type: string): ((id: string, version?: string) => Promise<any>) | null {
  switch (type) {
    case 'event':
      return sdk.getEvent;
    case 'command':
      return sdk.getCommand;
    case 'query':
      return sdk.getQuery;
    case 'service':
      return sdk.getService;
    case 'domain':
      return sdk.getDomain;
    case 'channel':
      return sdk.getChannel;
    case 'container':
      return sdk.getDataStore;
    case 'dataProduct':
      return sdk.getDataProduct;
    case 'diagram':
      return sdk.getDiagram;
    case 'team':
      return sdk.getTeam;
    case 'user':
      return sdk.getUser;
    default:
      return null;
  }
}

export function promptConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

export function promptInput(message: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

export function initCatalog(dir: string, organizationName: string = 'My Organization'): void {
  const catalogDir = resolve(dir);
  mkdirSync(catalogDir, { recursive: true });

  // package.json
  const packageJson = {
    name: 'my-catalog',
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'eventcatalog dev',
      build: 'eventcatalog build',
      start: 'eventcatalog start',
      preview: 'eventcatalog preview',
      generate: 'eventcatalog generate',
      lint: 'eventcatalog-linter',
      test: 'echo "Error: no test specified" && exit 1',
    },
    dependencies: {
      '@eventcatalog/core': 'latest',
      '@eventcatalog/linter': 'latest',
    },
  };
  writeFileSync(join(catalogDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

  // eventcatalog.config.js
  const cId = randomUUID();
  const config = `/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: 'EventCatalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures',
  organizationName: '${organizationName}',
  homepageLink: 'https://eventcatalog.dev/',
  output: 'static',
  trailingSlash: false,
  base: '/',
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'EventCatalog',
  },
  cId: '${cId}',
};
`;
  writeFileSync(join(catalogDir, 'eventcatalog.config.js'), config, 'utf-8');

  // .gitignore
  const gitignore = `# Dependencies
/node_modules

# Production
/build

# Generated files
.astro
out
dist

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

.eventcatalog-core

.env
.env-*
`;
  writeFileSync(join(catalogDir, '.gitignore'), gitignore, 'utf-8');

  // .env
  const envFile = `# EventCatalog Scale License Key, if you want to unlock the scale features
# You can get a 14 day trial license key from https://eventcatalog.cloud

EVENTCATALOG_SCALE_LICENSE_KEY=

# Optional key if you are using EventCatalog Chat with OpenAI Models.
# You need to set \`output\` to \`server\` in your eventcatalog.config.js file.
# See documentation for more details: https://www.eventcatalog.dev/features/ai-assistant
OPENAI_API_KEY=
`;
  writeFileSync(join(catalogDir, '.env'), envFile, 'utf-8');

  // .npmrc
  writeFileSync(join(catalogDir, '.npmrc'), 'strict-peer-dependencies=false\n', 'utf-8');

  // public/logo.png
  mkdirSync(join(catalogDir, 'public'), { recursive: true });
  copyFileSync(join(__dirname, 'logo.png'), join(catalogDir, 'public', 'logo.png'));
}

export async function importDSL(options: ImportOptions): Promise<string> {
  const { files, stdin = false, dryRun = false, flat = false, noInit = false, dir } = options;
  const nested = !flat;

  let source: string;

  if (stdin) {
    source = await readStdin();
  } else if (files && files.length > 0) {
    const parts: string[] = [];
    for (const file of files) {
      const filepath = resolve(file);
      if (!existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
      }
      parts.push(readFileSync(filepath, 'utf-8'));
    }
    source = parts.join('\n\n');
  } else {
    throw new Error('Either provide .ec file paths or use --stdin');
  }

  if (!source.trim()) {
    throw new Error('No DSL content to import');
  }

  // Check if catalog needs initialization
  const catalogDir = resolve(dir);
  let didInit = false;
  if (!noInit && !existsSync(join(catalogDir, 'eventcatalog.config.js')) && process.stdin.isTTY) {
    const confirmed = await promptConfirm(`Initialize a new EventCatalog at ${catalogDir}? (Y/n)`);
    if (confirmed) {
      const organizationName = await promptInput('Organization name (My Organization):', 'My Organization');
      initCatalog(dir, organizationName);
      didInit = true;
    }
  }

  const parsed = await parseDSL(source, { nested });
  const outputs = parsed.outputs;

  if (outputs.length === 0) {
    throw new Error('No resources found in DSL content');
  }

  const sdk = createSDK(catalogDir);
  const result: ImportResult = { created: [], updated: [], versioned: [], errors: [] };
  const readerCache = new Map<string, Promise<any>>();

  const readResourceCached = async (
    reader: ((id: string, version?: string) => Promise<any>) | null,
    type: string,
    id: string,
    version?: string
  ): Promise<any> => {
    if (!reader) return undefined;
    const cacheKey = getResourceVersionKey(type, id, version);
    if (!readerCache.has(cacheKey)) {
      readerCache.set(
        cacheKey,
        reader(id, version).catch(() => undefined)
      );
    }
    return await readerCache.get(cacheKey)!;
  };

  const invalidateReaderCache = (type: string, id: string, version?: string): void => {
    // We only read "latest" (no version) and the current version in this import path,
    // so targeted invalidation avoids scanning the full cache for every write.
    readerCache.delete(getResourceVersionKey(type, id));
    readerCache.delete(getResourceVersionKey(type, id, version));
  };

  const resources = outputs.map(parseCompiledOutput);
  const serviceContainerRefsByPath = extractServiceContainerRefs(parsed.program, nested);

  for (const resource of resources) {
    if (resource.type !== 'service') continue;
    const refs = serviceContainerRefsByPath.get(resource.path);
    if (!refs) continue;
    resource.frontmatter = {
      ...resource.frontmatter,
      ...refs,
    };
  }

  // Create stub resources for referenced messages that weren't compiled as standalone
  const compiledIds = new Set<string>();
  for (const resource of resources) {
    compiledIds.add(getResourceNameKey(resource.type, resource.id));
    compiledIds.add(getResourceVersionKey(resource.type, resource.id, resource.version));
  }
  const stubs = hasReferenceStatements(source) ? await extractMessageStubs(parsed.program, compiledIds, nested) : [];
  resources.push(...stubs);

  for (const resource of resources) {
    const label = resource.version ? `${resource.type} ${resource.id}@${resource.version}` : `${resource.type} ${resource.id}`;

    if (dryRun) {
      const reader = getReader(sdk, resource.type);
      if (reader) {
        const existing = await readResourceCached(reader, resource.type, resource.id, resource.version);
        if (existing) {
          result.updated.push(label);
        } else {
          const latest = await readResourceCached(reader, resource.type, resource.id);
          if (latest && latest.version && latest.version !== resource.version) {
            result.versioned.push(`${resource.type} ${resource.id}@${latest.version}`);
          }
          result.created.push(label);
        }
      } else {
        result.created.push(label);
      }
      continue;
    }

    const writer = getWriter(sdk, resource.type);
    if (!writer) {
      result.errors.push(`${label}: unsupported resource type '${resource.type}'`);
      continue;
    }

    try {
      const reader = getReader(sdk, resource.type);
      const existing = await readResourceCached(reader, resource.type, resource.id, resource.version);
      const latest = !existing && resource.version ? await readResourceCached(reader, resource.type, resource.id) : undefined;
      const versionedFrom =
        !existing && resource.version && latest?.version && latest.version !== resource.version ? latest.version : undefined;

      const incomingMarkdown = resource.markdown;
      const hasIncomingMarkdown = incomingMarkdown.trim().length > 0;
      let markdown = incomingMarkdown;

      // Preserve existing markdown when DSL import has no markdown body.
      if (!hasIncomingMarkdown) {
        if (existing?.markdown) {
          markdown = existing.markdown;
        } else if (!existing && latest?.markdown) {
          // If importing a newer version without markdown, carry forward latest markdown.
          markdown = latest.markdown;
        }
      }

      // Add <NodeGraph /> to markdown for newly created resources (not updates)
      if (!existing && TYPES_WITH_NODE_GRAPH.has(resource.type)) {
        if (!markdown) {
          markdown = '<NodeGraph />';
        } else if (!markdown.includes('<NodeGraph />')) {
          markdown = `${markdown}\n\n<NodeGraph />`;
        }
      }

      const resourceData = {
        ...normalizeImportedFrontmatter(resource.type, resource.frontmatter),
        markdown,
      };

      // If resource already exists, write with default SDK behavior (existing location).
      // For new resources in nested mode, extract directory from compiler path.
      const writeOptions: Record<string, any> = {
        override: true,
        versionExistingContent: Boolean(versionedFrom),
      };

      if (!existing && nested) {
        const sdkPath = extractSdkPath(resource.path, resource.type);
        if (sdkPath) {
          writeOptions.path = sdkPath;
        }
      }

      await writer(resourceData, writeOptions);
      invalidateReaderCache(resource.type, resource.id, resource.version);

      if (existing) {
        result.updated.push(label);
      } else {
        result.created.push(label);
        if (versionedFrom) {
          result.versioned.push(`${resource.type} ${resource.id}@${versionedFrom}`);
        }
      }
    } catch (error) {
      result.errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let output = formatResult(result, dryRun);
  if (didInit) {
    output += `  Tip: Run 'npm install' in ${catalogDir} to install dependencies\n`;
  }
  return output;
}

// ANSI color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const TYPE_CONFIG: Record<string, { color: string; label: string; order: number }> = {
  domain: { color: c.magenta, label: 'domain', order: 0 },
  service: { color: c.blue, label: 'service', order: 1 },
  event: { color: c.green, label: 'event', order: 2 },
  command: { color: c.yellow, label: 'command', order: 3 },
  query: { color: c.cyan, label: 'query', order: 4 },
  channel: { color: c.gray, label: 'channel', order: 5 },
  flow: { color: c.white, label: 'flow', order: 6 },
  container: { color: c.white, label: 'container', order: 7 },
  dataProduct: { color: c.white, label: 'data product', order: 8 },
  diagram: { color: c.white, label: 'diagram', order: 9 },
  user: { color: c.blue, label: 'user', order: 10 },
  team: { color: c.blue, label: 'team', order: 11 },
};

const DEFAULT_TYPE_CONFIG = { color: c.white, label: 'resource', order: 99 };

/**
 * Parse a label like "event OrderCreated@1.0.0" into { type, name }.
 */
function parseLabel(label: string): { type: string; name: string } {
  const spaceIdx = label.indexOf(' ');
  if (spaceIdx === -1) return { type: '', name: label };
  return { type: label.slice(0, spaceIdx), name: label.slice(spaceIdx + 1) };
}

/**
 * Group labels by resource type, sorted by type order then alphabetically.
 */
function groupByType(labels: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const label of labels) {
    const { type, name } = parseLabel(label);
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(name);
  }
  const sorted = new Map(
    [...groups.entries()].sort((a, b) => {
      const orderA = (TYPE_CONFIG[a[0]] || DEFAULT_TYPE_CONFIG).order;
      const orderB = (TYPE_CONFIG[b[0]] || DEFAULT_TYPE_CONFIG).order;
      return orderA - orderB;
    })
  );
  for (const [, names] of sorted) {
    names.sort();
  }
  return sorted;
}

/**
 * Format a type badge like "  event  " with background color.
 */
function typeBadge(type: string): string {
  const cfg = TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG;
  const padded = ` ${cfg.label} `;
  // Use reverse video for a "badge" effect: swaps fg/bg
  return `${cfg.color}\x1b[7m${padded}${c.reset}`;
}

function formatResourceList(labels: string[]): string[] {
  const lines: string[] = [];
  const groups = groupByType(labels);

  for (const [type, names] of groups) {
    const cfg = TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG;
    const plural = names.length === 1 ? cfg.label : `${cfg.label}s`;
    lines.push('');
    lines.push(`   ${typeBadge(type)} ${c.dim}${names.length} ${plural}${c.reset}`);
    for (const name of names) {
      lines.push(`   ${cfg.color}│${c.reset}  ${name}`);
    }
  }
  return lines;
}

function formatResult(result: ImportResult, dryRun: boolean): string {
  const lines: string[] = [''];
  const prefix = dryRun ? `${c.yellow}${c.bold}DRY RUN${c.reset} ` : '';
  const total = result.created.length + result.updated.length + result.versioned.length;

  if (total > 0 || result.errors.length > 0) {
    lines.push(`  ${prefix}${c.bold}Import complete${c.reset}`);
    lines.push(`  ${c.dim}${'─'.repeat(40)}${c.reset}`);
  }

  if (result.created.length > 0) {
    const verb = dryRun ? 'Would create' : 'Created';
    lines.push('');
    lines.push(`  ${c.green}${c.bold}+ ${verb} ${result.created.length} resource(s)${c.reset}`);
    lines.push(...formatResourceList(result.created));
  }

  if (result.updated.length > 0) {
    const verb = dryRun ? 'Would update' : 'Updated';
    lines.push('');
    lines.push(`  ${c.blue}${c.bold}~ ${verb} ${result.updated.length} resource(s)${c.reset}`);
    lines.push(...formatResourceList(result.updated));
  }

  if (result.versioned.length > 0) {
    const verb = dryRun ? 'Would version' : 'Versioned';
    lines.push('');
    lines.push(`  ${c.yellow}${c.bold}↑ ${verb} ${result.versioned.length} existing resource(s)${c.reset}`);
    lines.push(...formatResourceList(result.versioned));
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`  ${c.red}${c.bold}✘ ${result.errors.length} error(s)${c.reset}`);
    for (const e of result.errors) {
      lines.push(`   ${c.red}│${c.reset}  ${c.red}${e}${c.reset}`);
    }
  }

  if (result.created.length === 0 && result.updated.length === 0 && result.errors.length === 0) {
    lines.push(`  ${c.dim}No resources to write.${c.reset}`);
  }

  lines.push('');
  return lines.join('\n');
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}
