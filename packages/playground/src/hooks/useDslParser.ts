import { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@eventcatalog/visualiser';
import type { DslError } from '../monaco/ec-diagnostics';

interface ParseResult {
  graph: { nodes: GraphNode[]; edges: GraphEdge[]; visualizers?: string[]; activeVisualizer?: string; title?: string; empty?: boolean; options?: { legend?: boolean; search?: boolean; toolbar?: boolean; focusMode?: boolean; style?: string } };
  errors: DslError[];
}

let langiumServices: any = null;
let astToGraphFn: any = null;
let docCounter = 1;

const urlFetchCache = new Map<string, string>();

const URL_IMPORT_RE = /import\s*\{[^}]*\}\s*from\s*"(https?:\/\/[^"]+)"/g;

async function resolveUrlImports(
  files: Record<string, string>
): Promise<{ files: Record<string, string>; errors: DslError[] }> {
  const errors: DslError[] = [];
  const allUrls = new Map<string, string[]>();

  for (const [filename, source] of Object.entries(files)) {
    let match;
    URL_IMPORT_RE.lastIndex = 0;
    while ((match = URL_IMPORT_RE.exec(source)) !== null) {
      const url = match[1];
      if (!allUrls.has(url)) {
        allUrls.set(url, []);
      }
      allUrls.get(url)!.push(filename);
    }
  }

  if (allUrls.size === 0) {
    return { files, errors };
  }

  const fetchResults = new Map<string, string>();
  const urlsToFetch = [...allUrls.keys()];

  await Promise.all(
    urlsToFetch.map(async (url) => {
      if (urlFetchCache.has(url)) {
        fetchResults.set(url, urlFetchCache.get(url)!);
        return;
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          errors.push({
            message: `Failed to fetch "${url}": ${resp.status} ${resp.statusText}`,
            line: 1,
            column: 1,
          });
          return;
        }
        const text = await resp.text();
        urlFetchCache.set(url, text);
        fetchResults.set(url, text);
      } catch (err) {
        errors.push({
          message: `Failed to fetch "${url}": ${String(err)}`,
          line: 1,
          column: 1,
        });
      }
    })
  );

  const newFiles: Record<string, string> = {};

  for (const [filename, source] of Object.entries(files)) {
    const stripped = source.replace(URL_IMPORT_RE, '').replace(/^\s*\n/gm, '');
    newFiles[filename] = stripped;
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

  const parserErrors = document.parseResult.parserErrors;
  const errors: DslError[] = parserErrors.map((e: any) => ({
    message: e.message,
    line: e.token.startLine ?? 1,
    column: e.token.startColumn ?? 1,
    endLine: e.token.endLine,
    endColumn: e.token.endColumn ? e.token.endColumn + 1 : undefined,
  }));

  const program = document.parseResult.value;
  const graph = astToGraphFn(program, activeVisualizer);

  try {
    langiumServices.shared.workspace.LangiumDocuments.deleteDocument(uri);
  } catch {
    // Ignore cleanup errors
  }

  return { graph, errors };
}

async function parseMultiFile(inputFiles: Record<string, string>, activeVisualizer?: string): Promise<ParseResult & { fileOffsets: FileOffsets }> {
  const { files: resolvedFiles, errors: fetchErrors } = await resolveUrlImports(inputFiles);

  const files = resolvedFiles;
  const filenames = Object.keys(files);
  const mainFile = filenames[0];
  const mainSource = files[mainFile];

  if (filenames.length === 1) {
    const result = await parseSingle(mainSource, activeVisualizer);
    const lineCount = mainSource.split('\n').length;
    return {
      ...result,
      errors: [...fetchErrors, ...result.errors],
      fileOffsets: { [mainFile]: { startLine: 1, lineCount } },
    };
  }

  const mainResult = await parseSingle(mainSource, activeVisualizer);
  const mainNodeIds = new Set(mainResult.graph.nodes.map((n) => n.id));

  const supportingFiles = filenames.filter((f) => f !== mainFile);
  const concatOrder = [...supportingFiles, mainFile];

  const fileOffsets: FileOffsets = {};
  const parts: string[] = [];
  let currentLine = 1;

  // Regex to match local file imports (not HTTP/HTTPS)
  const localImportRe = /import\s*\{[^}]*\}\s*from\s*"(?!https?:\/\/)([^"]+)"\s*\n?/g;

  for (const filename of concatOrder) {
    let content = files[filename];

    // Strip local file imports since we're concatenating all files
    content = content.replace(localImportRe, '');

    const lineCount = content.split('\n').length;
    fileOffsets[filename] = { startLine: currentLine, lineCount };
    parts.push(content);
    currentLine += lineCount;
  }

  const combinedSource = parts.join('\n');
  const fullResult = await parseSingle(combinedSource, activeVisualizer);

  // Map main node IDs to their corresponding nodes in fullResult
  // Nodes may have different IDs if versions were added (e.g., service:X vs service:X@1.0.0)
  const mainNodeKeys = new Set(
    mainResult.graph.nodes.map((n) => {
      // Extract type:name without version
      const match = n.id.match(/^([^:]+):([^@]+)/);
      return match ? `${match[1]}:${match[2]}` : n.id;
    })
  );

  // Find all nodes in fullResult that match main nodes (by type:name)
  const filteredNodeIds = new Set<string>();
  for (const node of fullResult.graph.nodes) {
    const match = node.id.match(/^([^:]+):([^@]+)/);
    const key = match ? `${match[1]}:${match[2]}` : node.id;
    if (mainNodeKeys.has(key)) {
      filteredNodeIds.add(node.id);
    }
  }

  // Iteratively expand to include all connected nodes
  // This ensures that when a service is referenced, we include its full definition
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

  const filteredNodes = fullResult.graph.nodes.filter((n) => filteredNodeIds.has(n.id));

  const filteredEdges = fullResult.graph.edges.filter(
    (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  return {
    graph: {
      nodes: filteredNodes,
      edges: filteredEdges,
      visualizers: fullResult.graph.visualizers,
      activeVisualizer: fullResult.graph.activeVisualizer,
      title: fullResult.graph.title,
      options: fullResult.graph.options,
    },
    errors: [...fetchErrors, ...fullResult.errors],
    fileOffsets,
  };
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
