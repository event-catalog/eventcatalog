import yaml from "js-yaml";
import type {
  SpecMessage,
  SpecChannel,
  ResourceType,
  ResolveError,
  SpecResolveResult,
  FetchFn,
} from "./types.js";
import {
  parseSpec,
  extractService,
  messageToEc,
  channelToEc,
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
  /import\s+(events|commands|queries|channels)\s*\{([^}]*)\}\s*from\s*"([^"]+\.(?:ya?ml|json))"\s*\n?/g;

// Matches: import OrderService from "./spec.yml"
// A bare identifier (no braces, no resource type keyword) imports a full service
// Also matches .json files for OpenAPI specs
const SERVICE_IMPORT_RE =
  /import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s*"([^"]+\.(?:ya?ml|json))"\s*\n?/g;

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

  // Filter messages by the requested resource type
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

function isSpecFile(filename: string): boolean {
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
 */
export async function resolveSpecImportsAsync(
  files: Record<string, string>,
  fetchFn: FetchFn,
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

  return {
    files: result.files,
    errors: [...fetchErrors, ...notFoundErrors, ...result.errors],
  };
}
