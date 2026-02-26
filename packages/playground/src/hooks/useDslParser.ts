import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@eventcatalog/visualiser';
import type { DslError } from '../monaco/ec-diagnostics';
import { resolveSpecImportsAsync } from '../resolvers';
import { cacheSpecContent } from '../monaco/ec-completion';

interface ParseResult {
  graph: { nodes: GraphNode[]; edges: GraphEdge[]; visualizers?: string[]; activeVisualizer?: string; title?: string; empty?: boolean; options?: { legend?: boolean; search?: boolean; toolbar?: boolean; focusMode?: boolean; style?: string } };
  errors: DslError[];
}

let langiumServices: any = null;
let astToGraphFn: any = null;
let compileFn: any = null;
let docCounter = 1;

const urlFetchCache = new Map<string, string>();

// Matches local file imports (not HTTP/HTTPS):
//   import { ... } from "file.ec"
//   import events { ... } from "file.yml"
//   import ServiceName from "file.yml"
const LOCAL_IMPORT_RE = /^\s*import\s+(?:(?:events|commands|queries|channels)\s+)?\{[^}]*\}\s*from\s*"(?!https?:\/\/)([^"]+)"\s*(?:\/\/.*)?$|^\s*import\s+[A-Z][a-zA-Z0-9_]*\s+from\s*"(?!https?:\/\/)([^"]+)"\s*(?:\/\/.*)?$/gm;

// Matches URL imports for .ec files (not spec files - those are handled by the resolver)
const URL_IMPORT_RE = /^\s*import\s*\{[^}]*\}\s*from\s*"(https?:\/\/[^"]+)"\s*(?:\/\/.*)?$/gm;

/**
 * Converts GitHub blob/tree URLs to raw.githubusercontent.com URLs.
 */
function toRawUrl(url: string): string {
  const ghMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/(.+)$/
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
  urlFetchCache.set(rawUrl, text);
  cacheSpecContent(url, text);
  return text;
}

async function resolveUrlImports(
  files: Record<string, string>
): Promise<{ files: Record<string, string>; errors: DslError[] }> {
  const errors: DslError[] = [];
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
          errors.push({ message: `Failed to fetch "${url}": ${resp.status} ${resp.statusText}`, line: 1, column: 1 });
          return;
        }
        const text = await resp.text();
        urlFetchCache.set(url, text);
        fetchResults.set(url, text);
      } catch (err) {
        errors.push({ message: `Failed to fetch "${url}": ${String(err)}`, line: 1, column: 1 });
      }
    })
  );

  const newFiles: Record<string, string> = {};

  for (const [filename, source] of Object.entries(files)) {
    newFiles[filename] = source.replace(URL_IMPORT_RE, '').replace(/^\s*\n/gm, '');
  }

  for (const [url, content] of fetchResults) {
    const segments = new URL(url).pathname.split('/');
    const basename = segments[segments.length - 1] || 'remote.ec';
    let name = basename;
    let i = 1;
    while (newFiles[name]) {
      name = `${i++}_${basename}`;
    }
    newFiles[name] = content;
  }

  return { files: newFiles, errors };
}

async function initServices() {
  if (langiumServices) return;
  const langModule = await import('@eventcatalog/language-server');
  const { EmptyFileSystem } = await import('langium');

  langiumServices = langModule.createEcServices(EmptyFileSystem);
  astToGraphFn = langModule.astToGraph;
  compileFn = langModule.compile;
}

export interface FileOffsets {
  [filename: string]: { startLine: number; lineCount: number };
}

async function parseSingle(source: string, activeVisualizer?: string): Promise<ParseResult> {
  await initServices();
  const { URI } = await import('langium');

  const uri = URI.parse(`file:///playground-${docCounter++}.ec`);
  const document = langiumServices.shared.workspace.LangiumDocumentFactory.fromString(source, uri);
  langiumServices.shared.workspace.LangiumDocuments.addDocument(document);
  await langiumServices.shared.workspace.DocumentBuilder.build([document]);

  const errors: DslError[] = document.parseResult.parserErrors.map((e: any) => ({
    message: e.message,
    line: e.token.startLine ?? 1,
    column: e.token.startColumn ?? 1,
    endLine: e.token.endLine,
    endColumn: e.token.endColumn ? e.token.endColumn + 1 : undefined,
  }));

  const graph = astToGraphFn(document.parseResult.value, activeVisualizer);

  try {
    langiumServices.shared.workspace.LangiumDocuments.deleteDocument(uri);
  } catch {
    // Ignore cleanup errors
  }

  return { graph, errors };
}

/**
 * Resolve all imports (AsyncAPI specs + URL .ec files) and strip local imports,
 * returning the resolved file map ready for concatenation.
 */
async function resolveAllImports(
  inputFiles: Record<string, string>
): Promise<{ files: Record<string, string>; errors: DslError[] }> {
  const { files: specResolved, errors: specErrors } = await resolveSpecImportsAsync(inputFiles, fetchSpec);
  const { files: urlResolved, errors: fetchErrors } = await resolveUrlImports(specResolved);
  return { files: urlResolved, errors: [...specErrors, ...fetchErrors] };
}

/**
 * Strip local file imports and concatenate files into a single source string.
 */
function stripAndConcatenate(
  files: Record<string, string>,
  order?: string[],
): { source: string; fileOffsets: FileOffsets } {
  const filenames = order ?? Object.keys(files);
  const fileOffsets: FileOffsets = {};
  const parts: string[] = [];
  let currentLine = 1;

  for (const filename of filenames) {
    const content = files[filename].replace(LOCAL_IMPORT_RE, '');
    const lineCount = content.split('\n').length;
    fileOffsets[filename] = { startLine: currentLine, lineCount };
    parts.push(content);
    currentLine += lineCount;
  }

  return { source: parts.join('\n'), fileOffsets };
}

async function parseMultiFile(inputFiles: Record<string, string>, activeVisualizer?: string): Promise<ParseResult & { fileOffsets: FileOffsets }> {
  const { files, errors: preErrors } = await resolveAllImports(inputFiles);
  const filenames = Object.keys(files);

  if (filenames.length === 0) {
    return {
      graph: { nodes: [], edges: [], empty: true },
      errors: preErrors,
      fileOffsets: {},
    };
  }

  const mainFile = filenames[0];
  const mainSource = files[mainFile];

  if (filenames.length === 1) {
    const result = await parseSingle(mainSource, activeVisualizer);
    return {
      ...result,
      errors: [...preErrors, ...result.errors],
      fileOffsets: { [mainFile]: { startLine: 1, lineCount: mainSource.split('\n').length } },
    };
  }

  const mainResult = await parseSingle(mainSource, activeVisualizer);

  // Concatenate supporting files before main file
  const supportingFiles = filenames.filter((f) => f !== mainFile);
  const concatOrder = [...supportingFiles, mainFile];
  const { source: combinedSource, fileOffsets } = stripAndConcatenate(files, concatOrder);
  const fullResult = await parseSingle(combinedSource, activeVisualizer);

  // Map main node IDs to their corresponding nodes in fullResult
  // Nodes may have different IDs if versions were added (e.g., service:X vs service:X@1.0.0)
  const extractNodeKey = (id: string) => {
    const match = id.match(/^([^:]+):([^@]+)/);
    return match ? `${match[1]}:${match[2]}` : id;
  };

  const mainNodeKeys = new Set(mainResult.graph.nodes.map((n) => extractNodeKey(n.id)));

  // Find all nodes in fullResult that match main nodes (by type:name)
  const filteredNodeIds = new Set(
    fullResult.graph.nodes
      .filter((node) => mainNodeKeys.has(extractNodeKey(node.id)))
      .map((node) => node.id)
  );

  // Iteratively expand to include all connected nodes
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of fullResult.graph.edges) {
      if (filteredNodeIds.has(edge.source) && !filteredNodeIds.has(edge.target)) {
        filteredNodeIds.add(edge.target);
        changed = true;
      }
      if (filteredNodeIds.has(edge.target) && !filteredNodeIds.has(edge.source)) {
        filteredNodeIds.add(edge.source);
        changed = true;
      }
    }
  }

  return {
    graph: {
      nodes: fullResult.graph.nodes.filter((n) => filteredNodeIds.has(n.id)),
      edges: fullResult.graph.edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)),
      visualizers: fullResult.graph.visualizers,
      activeVisualizer: fullResult.graph.activeVisualizer,
      title: fullResult.graph.title,
      options: fullResult.graph.options,
    },
    errors: [...preErrors, ...fullResult.errors],
    fileOffsets,
  };
}

export interface CompiledFile {
  path: string;
  content: string;
}

export async function compileDsl(files: Record<string, string>): Promise<CompiledFile[]> {
  await initServices();
  const { URI } = await import('langium');

  const { files: resolvedFiles } = await resolveAllImports(files);
  const { source: combinedSource } = stripAndConcatenate(resolvedFiles);

  const uri = URI.parse(`file:///compile-${docCounter++}.ec`);
  const document = langiumServices.shared.workspace.LangiumDocumentFactory.fromString(combinedSource, uri);
  langiumServices.shared.workspace.LangiumDocuments.addDocument(document);
  await langiumServices.shared.workspace.DocumentBuilder.build([document]);

  const parserErrors = document.parseResult.parserErrors;
  if (parserErrors.length > 0) {
    try {
      langiumServices.shared.workspace.LangiumDocuments.deleteDocument(uri);
    } catch {}
    throw new Error(`DSL has parse errors: ${parserErrors[0].message}`);
  }

  const compiled: CompiledFile[] = compileFn(document.parseResult.value, { nested: true });

  try {
    langiumServices.shared.workspace.LangiumDocuments.deleteDocument(uri);
  } catch {}

  return compiled;
}

export function useDslParser(files: Record<string, string>, activeVisualizer?: string) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[]; visualizers?: string[]; activeVisualizer?: string; empty?: boolean; options?: { legend?: boolean; search?: boolean; toolbar?: boolean; focusMode?: boolean; style?: string } }>({
    nodes: [],
    edges: [],
  });
  const [errors, setErrors] = useState<DslError[]>([]);
  const [fileOffsets, setFileOffsets] = useState<FileOffsets>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doParse = useCallback(async (f: Record<string, string>, vizName?: string) => {
    try {
      const result = await parseMultiFile(f, vizName);
      setErrors(result.errors);
      setGraph(result.graph);
      setFileOffsets(result.fileOffsets);
    } catch (err) {
      console.error('Parse error:', err);
      setErrors([{ message: String(err), line: 1, column: 1 }]);
      setGraph({ nodes: [], edges: [] });
      setFileOffsets({});
    }
  }, []);

  const filesKey = JSON.stringify(files);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { doParse(files, activeVisualizer); }, 150);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [filesKey, activeVisualizer, doParse]);

  return { graph, errors, fileOffsets };
}
