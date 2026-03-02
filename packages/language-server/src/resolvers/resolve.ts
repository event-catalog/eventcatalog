import yaml from "js-yaml";
import {
  isCatalogPath,
  type SpecMessage,
  type SpecChannel,
  type ResourceType,
  type ResolveError,
  type SpecResolveResult,
  type FetchFn,
} from "./types.js";
import {
  parseSpec,
  extractService,
  messageToEc,
  channelToEc,
  containerToEc,
  serviceToEc,
} from "./asyncapi.js";
import {
  parseOpenApiSpec,
  extractOpenApiService,
  openApiServiceToEc,
  openApiMessageToEc,
} from "./openapi.js";
// Matches: import events { OrderCreated } from "./spec.yml"
// Matches: import channels { orderEvents } from "./spec.yml"
// Matches: import events { OrderCreated } from "https://example.com/spec.yml"
// Also matches .json files for OpenAPI specs
const SPEC_IMPORT_RE =
  /^\s*import\s+(events|commands|queries|channels)\s*\{([^}]*)\}\s*from\s*"([^"]+\.(?:ya?ml|json))"\s*(?:\/\/.*)?$/gm;

// Matches: import OrderService from "./spec.yml"
// A bare identifier (no braces, no resource type keyword) imports a full service
// Also matches .json files for OpenAPI specs
const SERVICE_IMPORT_RE =
  /^\s*import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s*"([^"]+\.(?:ya?ml|json))"\s*(?:\/\/.*)?$/gm;

// Matches: import events { OrderCreated } from "./my-catalog"
// Matches: import services { OrderService } from "./my-catalog"
// Matches: import containers { PaymentsDB } from "./my-catalog"
// Catches any typed import whose path is NOT a spec file and NOT a URL (i.e., a directory path).
// Uses the same shape as SPEC_IMPORT_RE but with a generic path capture.
const CATALOG_IMPORT_RE =
  /^\s*import\s+(events|commands|queries|channels|services|containers)\s*\{([^}]*)\}\s*from\s*"([^"]+)"\s*(?:\/\/.*)?$/gm;

type SpecType = "asyncapi" | "openapi" | "unknown";

/**
 * Detect whether a spec document is AsyncAPI or OpenAPI based on its content.
 */
export function detectSpecType(content: string): SpecType {
  try {
    let doc: any;
    try {
      doc = JSON.parse(content);
    } catch {
      doc = yaml.load(content);
    }
    if (!doc || typeof doc !== "object") return "unknown";
    if (doc.asyncapi) return "asyncapi";
    if (doc.openapi) return "openapi";
    return "unknown";
  } catch {
    return "unknown";
  }
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
  SPEC_IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = SPEC_IMPORT_RE.exec(source)) !== null) {
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

function findCatalogImports(source: string): ImportMatch[] {
  const imports: ImportMatch[] = [];
  CATALOG_IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = CATALOG_IMPORT_RE.exec(source)) !== null) {
    const specPath = match[3];
    // Only keep matches that are catalog paths (not spec files, not URLs)
    if (!isCatalogPath(specPath)) continue;
    imports.push({
      full: match[0],
      resourceType: match[1] as ResourceType,
      importNames: match[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      specPath,
    });
  }
  return imports;
}

async function resolveCatalogImportToEc(
  imp: ImportMatch,
  basePath: string,
  importingFile?: string,
): Promise<ImportResolution> {
  // Dynamic imports to avoid pulling Node.js/SDK deps into browser builds
  const { resolve, dirname, isAbsolute } = await import("node:path");
  // Resolve relative paths against the importing file's directory when available,
  // falling back to basePath for absolute paths or when the file is unknown.
  let catalogDir: string;
  if (importingFile && !isAbsolute(imp.specPath)) {
    const fileDir = resolve(basePath, dirname(importingFile));
    catalogDir = resolve(fileDir, imp.specPath);
  } else {
    catalogDir = resolve(basePath, imp.specPath);
  }

  // Service imports use a different code path
  if (imp.resourceType === "services") {
    const { parseCatalogServices } = await import("./catalog.js");
    const { services, errors } = await parseCatalogServices(catalogDir);

    const ecDefs = imp.importNames.map((name) => {
      const svc = services.get(name);
      if (!svc) {
        errors.push({
          message: `Service "${name}" not found in catalog "${imp.specPath}". Available: ${[...services.keys()].join(", ") || "(none)"}`,
          line: 1,
          column: 1,
        });
        return `// ERROR: Service "${name}" not found in catalog ${imp.specPath}`;
      }
      return serviceToEc(svc);
    });

    return { ec: ecDefs.join("\n\n"), errors };
  }

  // Channel imports use a dedicated resolver to capture address/protocol
  if (imp.resourceType === "channels") {
    const { parseCatalogChannels } = await import("./catalog.js");
    const { channels, errors } = await parseCatalogChannels(catalogDir);

    const ecDefs = imp.importNames.map((name) => {
      const ch = channels.get(name);
      if (!ch) {
        errors.push({
          message: `Channel "${name}" not found in catalog "${imp.specPath}". Available: ${[...channels.keys()].join(", ") || "(none)"}`,
          line: 1,
          column: 1,
        });
        return `// ERROR: Channel "${name}" not found in catalog ${imp.specPath}`;
      }
      return channelToEc(ch);
    });

    return { ec: ecDefs.join("\n\n"), errors };
  }

  const { parseCatalogResources } = await import("./catalog.js");
  const { messages, errors } = await parseCatalogResources(
    catalogDir,
    imp.resourceType,
  );

  const ecDefs = imp.importNames.map((name) => {
    const msg = messages.get(name);
    if (!msg) {
      errors.push({
        message: `"${name}" not found in catalog "${imp.specPath}". Available: ${[...messages.keys()].join(", ") || "(none)"}`,
        line: 1,
        column: 1,
      });
      return `// ERROR: "${name}" not found in catalog ${imp.specPath}`;
    }
    return imp.resourceType === "containers"
      ? containerToEc(msg)
      : messageToEc(msg, imp.resourceType);
  });

  return { ec: ecDefs.join("\n\n"), errors };
}

interface ImportResolution {
  ec: string;
  errors: ResolveError[];
}

function resolveAsyncApiImportToEc(
  imp: ImportMatch,
  specContent: string,
  cachedParsedSpecs: Map<string, ReturnType<typeof parseSpec>>,
): ImportResolution {
  const errors: ResolveError[] = [];

  const cacheKey = normalizeSpecKey(imp.specPath);

  if (!cachedParsedSpecs.has(cacheKey)) {
    const parsed = parseSpec(specContent);
    cachedParsedSpecs.set(cacheKey, parsed);
    errors.push(...parsed.errors);
  }
  const parsed = cachedParsedSpecs.get(cacheKey)!;

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

function resolveOpenApiImportToEc(
  imp: ImportMatch,
  specContent: string,
  cachedParsedSpecs: Map<string, ReturnType<typeof parseOpenApiSpec>>,
): ImportResolution {
  const errors: ResolveError[] = [];

  // OpenAPI does not support event or channel imports
  if (imp.resourceType === "events") {
    errors.push({
      message: `OpenAPI specs contain commands and queries, not events. Use "import commands" or "import queries" instead for "${imp.specPath}".`,
      line: 1,
      column: 1,
    });
    return {
      ec: `// ERROR: OpenAPI specs do not contain events`,
      errors,
    };
  }
  if (imp.resourceType === "channels") {
    errors.push({
      message: `OpenAPI specs do not contain channels for "${imp.specPath}".`,
      line: 1,
      column: 1,
    });
    return {
      ec: `// ERROR: OpenAPI specs do not contain channels`,
      errors,
    };
  }

  const cacheKey = normalizeSpecKey(imp.specPath);

  if (!cachedParsedSpecs.has(cacheKey)) {
    const parsed = parseOpenApiSpec(specContent);
    cachedParsedSpecs.set(cacheKey, parsed);
    errors.push(...parsed.errors);
  }
  const parsed = cachedParsedSpecs.get(cacheKey)!;

  // Map the import keyword to the expected message type
  const expectedType: "command" | "query" =
    imp.resourceType === "commands" ? "command" : "query";

  const ecDefs = imp.importNames.map((name) => {
    const msg = parsed.messages.get(name);
    if (!msg) {
      errors.push({
        message: `Message "${name}" not found in OpenAPI spec "${imp.specPath}". Available: ${[...parsed.messages.keys()].join(", ") || "(none)"}`,
        line: 1,
        column: 1,
      });
      return `// ERROR: "${name}" not found in ${imp.specPath}`;
    }
    // Enforce that the message type matches the import keyword
    if (msg.messageType !== expectedType) {
      errors.push({
        message: `"${name}" is a ${msg.messageType} but was imported as "${imp.resourceType}" in "${imp.specPath}". Use "import ${msg.messageType === "command" ? "commands" : "queries"} { ${name} }" instead.`,
        line: 1,
        column: 1,
      });
      return `// ERROR: "${name}" is a ${msg.messageType}, not a ${expectedType}`;
    }
    return openApiMessageToEc(msg);
  });

  return { ec: ecDefs.join("\n\n"), errors };
}

function resolveServiceImportToEc(
  imp: ServiceImportMatch,
  specContent: string,
  specType: SpecType,
): ImportResolution {
  if (specType === "openapi") {
    const { service, errors } = extractOpenApiService(
      specContent,
      imp.serviceName,
    );
    return { ec: openApiServiceToEc(service), errors };
  }
  // Default to AsyncAPI
  const { service, errors } = extractService(specContent, imp.serviceName);
  return { ec: serviceToEc(service), errors };
}

function isUrl(path: string): boolean {
  return path.startsWith("https://") || path.startsWith("http://");
}

function normalizeSpecKey(specPath: string): string {
  return isUrl(specPath) ? specPath : specPath.replace(/^\.\//, "");
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

export function isSpecFile(filename: string): boolean {
  return (
    filename.endsWith(".yml") ||
    filename.endsWith(".yaml") ||
    filename.endsWith(".json")
  );
}

const SKIP = Symbol("skip");
type SpecLookup = (specPath: string) => string | typeof SKIP | undefined;

/**
 * Core resolution logic shared by sync and async resolvers.
 * Given a spec content lookup function, resolves all imports in .ec files.
 * Auto-detects whether each spec is AsyncAPI or OpenAPI.
 * Return `SKIP` from the callback to leave an import untouched;
 * return `undefined` to replace it with an error comment.
 */
function resolveFileImports(
  files: Record<string, string>,
  getSpecContent: SpecLookup,
): SpecResolveResult {
  const errors: ResolveError[] = [];
  const newFiles: Record<string, string> = {};
  const cachedAsyncApiSpecs = new Map<string, ReturnType<typeof parseSpec>>();
  const cachedOpenApiSpecs = new Map<
    string,
    ReturnType<typeof parseOpenApiSpec>
  >();
  const specTypeCache = new Map<string, SpecType>();

  function getSpecType(specPath: string, content: string): SpecType {
    const cacheKey = normalizeSpecKey(specPath);
    if (!specTypeCache.has(cacheKey)) {
      specTypeCache.set(cacheKey, detectSpecType(content));
    }
    return specTypeCache.get(cacheKey)!;
  }

  for (const [filename, source] of Object.entries(files)) {
    if (isSpecFile(filename)) continue;

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
          `// ERROR: Spec file not available: ${imp.specPath}`,
        );
        continue;
      }

      const specType = getSpecType(imp.specPath, specContent);

      let resolution: ImportResolution;
      if (specType === "openapi") {
        resolution = resolveOpenApiImportToEc(
          imp,
          specContent,
          cachedOpenApiSpecs,
        );
      } else {
        resolution = resolveAsyncApiImportToEc(
          imp,
          specContent,
          cachedAsyncApiSpecs,
        );
      }
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
          `// ERROR: Spec file not available: ${imp.specPath}`,
        );
        continue;
      }

      const specType = getSpecType(imp.specPath, specContent);
      const resolution = resolveServiceImportToEc(imp, specContent, specType);
      errors.push(...resolution.errors);
      result = result.replace(imp.full, resolution.ec);
    }

    newFiles[filename] = result;
  }

  return { files: newFiles, errors };
}

/**
 * Resolve all spec imports in a set of files (sync, local files only).
 * Scans .ec files for `import <type> { ... } from "*.yml"` and
 * `import ServiceName from "*.yml"` statements, auto-detects whether
 * each spec is AsyncAPI or OpenAPI, and replaces the imports with
 * synthesized .ec definitions.
 * Spec files (YAML/JSON) are excluded from the output.
 * URL imports are left untouched - use resolveSpecImportsAsync for those.
 */
export function resolveSpecImports(
  files: Record<string, string>,
): SpecResolveResult {
  const notFoundErrors: ResolveError[] = [];

  const result = resolveFileImports(files, (specPath) => {
    if (isUrl(specPath)) return SKIP;
    const content = lookupLocalSpec(specPath, files);
    if (!content) {
      notFoundErrors.push({
        message: `Spec file not found: "${specPath}"`,
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
 * Resolve all spec imports including remote URLs (async).
 * Fetches remote specs via the provided fetchFn, then resolves all imports.
 * Auto-detects AsyncAPI vs OpenAPI from file content.
 * For local file imports, looks them up in the files map.
 * When basePath is provided, also resolves catalog directory imports
 * (e.g., `import events { OrderCreated } from "./my-catalog"`).
 */
export async function resolveSpecImportsAsync(
  files: Record<string, string>,
  fetchFn: FetchFn,
  basePath?: string,
): Promise<SpecResolveResult> {
  // Collect all unique remote URLs that need fetching
  const urlsToFetch = new Set<string>();
  for (const [filename, source] of Object.entries(files)) {
    if (isSpecFile(filename)) continue;
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
          message: `Failed to fetch spec "${url}": ${String(err)}`,
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
        message: `Spec file not found: "${specPath}"`,
        line: 1,
        column: 1,
      });
    }
    return content;
  });

  // Resolve catalog directory imports (import events { ... } from "./my-catalog")
  // Only when basePath is provided (Node.js/VSCode context, not browser)
  if (basePath) {
    const catalogErrors: ResolveError[] = [];

    // Collect files that have catalog imports so we can resolve them in parallel.
    // The TTL cache in catalog.ts ensures that multiple imports pointing at
    // the same catalog directory only trigger one SDK scan.
    const filesToResolve: { filename: string; imports: ImportMatch[] }[] = [];
    for (const [filename, source] of Object.entries(result.files)) {
      const catalogImports = findCatalogImports(source);
      if (catalogImports.length > 0) {
        filesToResolve.push({ filename, imports: catalogImports });
      }
    }

    // Resolve all files and their imports in parallel.
    // Imports within a file are also resolved concurrently since they may
    // point at different catalog directories.
    const catalogResolutions = new Map<string, string>();
    await Promise.all(
      filesToResolve.map(async ({ filename, imports }) => {
        const resolutions = await Promise.all(
          imports.map(async (imp) => {
            try {
              return await resolveCatalogImportToEc(imp, basePath, filename);
            } catch (err) {
              return {
                ec: `// ERROR: Failed to resolve catalog "${imp.specPath}": ${String(err)}`,
                errors: [
                  {
                    message: `Failed to resolve catalog "${imp.specPath}": ${String(err)}`,
                    line: 1,
                    column: 1,
                  },
                ],
              } as ImportResolution;
            }
          }),
        );
        let resolved = result.files[filename];
        for (let i = 0; i < imports.length; i++) {
          catalogErrors.push(...resolutions[i].errors);
          resolved = resolved.replace(imports[i].full, resolutions[i].ec);
        }
        catalogResolutions.set(filename, resolved);
      }),
    );

    // Build output preserving the original file order from result.files
    const resolvedFiles: Record<string, string> = {};
    for (const filename of Object.keys(result.files)) {
      resolvedFiles[filename] =
        catalogResolutions.get(filename) ?? result.files[filename];
    }

    return {
      files: resolvedFiles,
      errors: [
        ...fetchErrors,
        ...notFoundErrors,
        ...result.errors,
        ...catalogErrors,
      ],
    };
  }

  return {
    files: result.files,
    errors: [...fetchErrors, ...notFoundErrors, ...result.errors],
  };
}
