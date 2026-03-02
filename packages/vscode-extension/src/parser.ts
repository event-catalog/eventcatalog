import { EmptyFileSystem, URI } from "langium";
import {
  createEcServices,
  astToGraph,
  resolveSpecImportsAsync,
} from "@eventcatalog/language-server";
import type { DslGraph, ResolveError } from "@eventcatalog/language-server";

// Singleton Langium services
let services: ReturnType<typeof createEcServices> | null = null;
let docCounter = 1;

const MAX_URL_CACHE_SIZE = 100;

function getServices() {
  if (!services) {
    services = createEcServices(EmptyFileSystem);
  }
  return services;
}

// Matches local file imports (not HTTP/HTTPS)
const LOCAL_IMPORT_RE =
  /^\s*import\s+(?:(?:events|commands|queries|channels|services|containers)\s+)?\{[^}]*\}\s*from\s*"(?!https?:\/\/)([^"]+)"\s*(?:\/\/.*)?$|^\s*import\s+[A-Z][a-zA-Z0-9_]*\s+from\s*"(?!https?:\/\/)([^"]+)"\s*(?:\/\/.*)?$/gm;

// Matches URL imports for .ec files
const URL_IMPORT_RE =
  /^\s*import\s*\{[^}]*\}\s*from\s*"(https?:\/\/[^"]+)"\s*(?:\/\/.*)?$/gm;

const urlFetchCache = new Map<string, string>();

function toRawUrl(url: string): string {
  const ghMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/(.+)$/,
  );
  return ghMatch
    ? `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}/${ghMatch[3]}`
    : url;
}

async function fetchSpec(url: string): Promise<string> {
  const rawUrl = toRawUrl(url);
  const cached = urlFetchCache.get(rawUrl);
  if (cached) return cached;

  const resp = await fetch(rawUrl);
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);

  const text = await resp.text();
  if (urlFetchCache.size >= MAX_URL_CACHE_SIZE) {
    const firstKey = urlFetchCache.keys().next().value;
    if (firstKey) urlFetchCache.delete(firstKey);
  }
  urlFetchCache.set(rawUrl, text);
  return text;
}

async function resolveUrlImports(
  files: Record<string, string>,
): Promise<{ files: Record<string, string>; errors: string[] }> {
  const errors: string[] = [];
  const allUrls = new Map<string, string[]>();

  for (const [filename, source] of Object.entries(files)) {
    URL_IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = URL_IMPORT_RE.exec(source)) !== null) {
      const url = match[1];
      const filenames = allUrls.get(url) ?? [];
      filenames.push(filename);
      allUrls.set(url, filenames);
    }
  }

  if (allUrls.size === 0) return { files, errors };

  const fetchResults = new Map<string, string>();
  await Promise.all(
    [...allUrls.keys()].map(async (url) => {
      const cached = urlFetchCache.get(url);
      if (cached) {
        fetchResults.set(url, cached);
        return;
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          errors.push(
            `Failed to fetch "${url}": ${resp.status} ${resp.statusText}`,
          );
          return;
        }
        const text = await resp.text();
        urlFetchCache.set(url, text);
        fetchResults.set(url, text);
      } catch (err) {
        errors.push(`Failed to fetch "${url}": ${String(err)}`);
      }
    }),
  );

  const newFiles: Record<string, string> = {};
  for (const [filename, source] of Object.entries(files)) {
    newFiles[filename] = source
      .replace(URL_IMPORT_RE, "")
      .replace(/^\s*\n/gm, "");
  }

  for (const [url, content] of fetchResults) {
    const segments = new URL(url).pathname.split("/");
    const basename = segments[segments.length - 1] || "remote.ec";
    let name = basename;
    let i = 1;
    while (newFiles[name]) {
      name = `${i++}_${basename}`;
    }
    newFiles[name] = content;
  }

  return { files: newFiles, errors };
}

async function resolveAllImports(
  inputFiles: Record<string, string>,
  basePath?: string,
): Promise<{ files: Record<string, string>; errors: string[] }> {
  const { files: specResolved, errors: specErrors } =
    await resolveSpecImportsAsync(inputFiles, fetchSpec, basePath);
  const { files: urlResolved, errors: fetchErrors } =
    await resolveUrlImports(specResolved);
  return {
    files: urlResolved,
    errors: [...specErrors.map((e: ResolveError) => e.message), ...fetchErrors],
  };
}

function stripAndConcatenate(
  files: Record<string, string>,
  order?: string[],
): { source: string } {
  const filenames = order ?? Object.keys(files);
  const parts: string[] = [];

  for (const filename of filenames) {
    const content = files[filename].replace(LOCAL_IMPORT_RE, "");
    parts.push(content);
  }

  return { source: parts.join("\n") };
}

async function parseSingle(
  source: string,
  activeVisualizer?: string,
): Promise<DslGraph> {
  const { shared } = getServices();

  const uri = URI.parse(`file:///vscode-preview-${docCounter++}.ec`);
  const document = shared.workspace.LangiumDocumentFactory.fromString(
    source,
    uri,
  );
  shared.workspace.LangiumDocuments.addDocument(document);
  await shared.workspace.DocumentBuilder.build([document]);

  const graph = astToGraph(document.parseResult.value, activeVisualizer);

  try {
    shared.workspace.LangiumDocuments.deleteDocument(uri);
  } catch {
    // Ignore cleanup errors
  }

  return graph;
}

/**
 * Parse all workspace .ec files and return a DslGraph for the visualiser.
 * When basePath is provided, catalog directory imports are also resolved.
 */
export async function parseWorkspaceFiles(
  files: Record<string, string>,
  activeVisualizer?: string,
  basePath?: string,
  activeFile?: string,
): Promise<DslGraph> {
  const { files: resolved } = await resolveAllImports(files, basePath);
  const filenames = Object.keys(resolved);

  if (filenames.length === 0) {
    return { nodes: [], edges: [], empty: true };
  }

  // Use the explicitly provided active file, falling back to the first file
  const mainFile =
    activeFile && resolved[activeFile] ? activeFile : filenames[0];
  const mainSource = resolved[mainFile];

  if (filenames.length === 1) {
    return parseSingle(mainSource, activeVisualizer);
  }

  // Parse main file alone to get its node IDs
  const mainResult = await parseSingle(mainSource, activeVisualizer);

  // Concatenate supporting files before main file
  const supportingFiles = filenames.filter((f) => f !== mainFile);
  const concatOrder = [...supportingFiles, mainFile];
  const { source: combinedSource } = stripAndConcatenate(resolved, concatOrder);
  const fullResult = await parseSingle(combinedSource, activeVisualizer);

  // Map main node IDs to their corresponding nodes in fullResult
  const extractNodeKey = (id: string) => {
    const match = id.match(/^([^:]+):([^@]+)/);
    return match ? `${match[1]}:${match[2]}` : id;
  };

  const mainNodeKeys = new Set(
    mainResult.nodes.map((n) => extractNodeKey(n.id)),
  );

  const filteredNodeIds = new Set(
    fullResult.nodes
      .filter((node) => mainNodeKeys.has(extractNodeKey(node.id)))
      .map((node) => node.id),
  );

  // Iteratively expand to include all connected nodes
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of fullResult.edges) {
      if (
        filteredNodeIds.has(edge.source) &&
        !filteredNodeIds.has(edge.target)
      ) {
        filteredNodeIds.add(edge.target);
        changed = true;
      }
      if (
        filteredNodeIds.has(edge.target) &&
        !filteredNodeIds.has(edge.source)
      ) {
        filteredNodeIds.add(edge.source);
        changed = true;
      }
    }
  }

  return {
    nodes: fullResult.nodes.filter((n) => filteredNodeIds.has(n.id)),
    edges: fullResult.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
    ),
    visualizers: fullResult.visualizers,
    activeVisualizer: fullResult.activeVisualizer,
    title: fullResult.title,
    options: fullResult.options,
  };
}
