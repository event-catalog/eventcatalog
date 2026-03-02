import type { Monaco } from '@monaco-editor/react';
import type { editor, languages, Position, CancellationToken } from 'monaco-editor';
import {
  parseSpec,
  parseOpenApiSpec,
  detectSpecType,
  RESOURCE_KEYWORDS,
  COMMON_PROPS,
  ANNOTATION_SUGGESTIONS,
  CONTEXT_SUGGESTIONS,
  MESSAGE_TYPE_PLURAL,
  collectRegexMatches,
  collectChannelNames,
  collectMessageNames,
  extractResourceVersions,
  parseSpecAuto,
  findEnclosingResource,
  isSpecFile,
} from '@eventcatalog/language-server/browser';
import type { Suggestion, SpecMessage } from '@eventcatalog/language-server/browser';

// ─── State & caching ────────────────────────────────────

let _allFilesSources: Record<string, string> = {};
const _fetchedSpecCache = new Map<string, string>();

// Invalidated when _allFilesSources changes
let _cachedAllText: string | null = null;
let _cachedSpecParsed: Map<string, ReturnType<typeof parseSpec>> | null = null;

export function setAllFilesSources(files: Record<string, string>) {
  _allFilesSources = files;
  _cachedAllText = null;
  _cachedSpecParsed = null;
}

/**
 * Cache fetched remote spec content so autocompletion can parse it.
 * Called by the playground when remote AsyncAPI specs are fetched.
 */
export function cacheSpecContent(url: string, content: string) {
  _fetchedSpecCache.set(url, content);
  _cachedSpecParsed = null;
}

function getAllText(): string {
  if (_cachedAllText === null) {
    _cachedAllText = Object.values(_allFilesSources).join('\n');
  }
  return _cachedAllText;
}

function getParsedSpecs(): Map<string, ReturnType<typeof parseSpec>> {
  if (_cachedSpecParsed === null) {
    _cachedSpecParsed = new Map();
    for (const [filename, content] of Object.entries(_allFilesSources)) {
      if (isSpecFile(filename)) {
        try {
          const parsed = parseSpecAuto(content);
          // Normalize to same shape as parseSpec return (add errors field)
          _cachedSpecParsed.set(filename, { ...parsed, errors: [] });
        } catch { /* skip invalid specs */ }
      }
    }
    for (const [url, content] of _fetchedSpecCache) {
      try {
        const parsed = parseSpecAuto(content);
        _cachedSpecParsed.set(url, { ...parsed, errors: [] });
      } catch { /* skip invalid specs */ }
    }
  }
  return _cachedSpecParsed;
}

// ─── Shared helpers for completion handlers ─────────────

function lookupSpecContent(specPath: string): string | undefined {
  const normalizedPath = specPath.replace(/^\.\//, '');
  return _allFilesSources[specPath]
    ?? _allFilesSources[normalizedPath]
    ?? _allFilesSources[`./${normalizedPath}`]
    ?? _fetchedSpecCache.get(specPath);
}

function getSpecSummaries(
  kind: 'messages' | 'channels',
  filterNames?: Set<string>,
): Map<string, string> {
  const summaries = new Map<string, string>();
  for (const [, parsed] of getParsedSpecs()) {
    const catalog = kind === 'channels' ? parsed.channels : parsed.messages;
    for (const [name, resource] of catalog) {
      if ((!filterNames || filterNames.has(name)) && resource.summary) {
        summaries.set(name, resource.summary);
      }
    }
  }
  return summaries;
}

function makeRange(position: Position, word: { startColumn: number; endColumn: number }) {
  return {
    startLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endLineNumber: position.lineNumber,
    endColumn: word.endColumn,
  };
}

// ─── Completion provider ────────────────────────────────

export function registerEcCompletion(monaco: Monaco) {
  monaco.languages.registerCompletionItemProvider('ec', {
    triggerCharacters: ['@', '"', '{', ' '],
    provideCompletionItems(
      model: editor.ITextModel,
      position: Position,
      _context: languages.CompletionContext,
      _token: CancellationToken,
    ): languages.ProviderResult<languages.CompletionList> {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      // Auto-complete file paths in import from "..."
      const importFromMatch = textBeforeCursor.match(/import\s+(?:(?:events|commands|queries|channels|containers)\s+)?\{[^}]*\}\s*from\s*"([^"]*)$/);
      if (importFromMatch) {
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column - importFromMatch[1].length,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        const fileNames = Object.keys(_allFilesSources).filter(f => f !== model.uri.path.split('/').pop());

        return {
          suggestions: fileNames.map((filename, i) => ({
            label: `./${filename}`,
            kind: monaco.languages.CompletionItemKind.File,
            detail: `Import from ${filename}`,
            insertText: `./${filename}`,
            range,
            sortText: String(i).padStart(5, '0'),
          })),
        };
      }

      // Auto-complete resource names inside import { ... }
      const importBracesMatch = textBeforeCursor.match(/import\s+(?:(events|commands|queries|channels|containers)\s+)?\{([^}]*)$/);
      if (importBracesMatch) {
        const word = model.getWordUntilPosition(position);
        const range = makeRange(position, word);
        const resourceKind = importBracesMatch[1] as 'events' | 'commands' | 'queries' | 'channels' | 'containers' | undefined;
        const alreadyImported = new Set(
          (importBracesMatch[2] || '').split(',').map(s => s.trim()).filter(Boolean)
        );

        const fromSpecMatch = lineContent.match(/from\s*"([^"]+\.(?:ya?ml|json))"/);

        if (resourceKind && fromSpecMatch) {
          const specContent = lookupSpecContent(fromSpecMatch[1]);
          if (specContent) {
            try {
              const parsed = parseSpecAuto(specContent);
              const catalog = resourceKind === 'channels' ? parsed.channels : parsed.messages;
              const normalizedPath = fromSpecMatch[1].replace(/^\.\//, '');

              return {
                suggestions: [...catalog.entries()]
                  .filter(([name]) => !alreadyImported.has(name))
                  .map(([name, resource], i) => ({
                    label: name,
                    kind: monaco.languages.CompletionItemKind.Field,
                    detail: resource.summary || `Import from ${normalizedPath}`,
                    insertText: name,
                    range,
                    sortText: String(i).padStart(5, '0'),
                  })),
              };
            } catch {
              // Fall through to generic suggestions
            }
          }
        }

        // Fallback: suggest resource names defined in .ec files
        const allText = getAllText();
        const ecResourceTypes = ['service', 'event', 'command', 'query', 'domain', 'channel', 'flow', 'container'];
        const resources = new Set<string>();
        for (const type of ecResourceTypes) {
          for (const name of collectRegexMatches(
            new RegExp(`\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{`, 'g'),
            allText,
          )) {
            resources.add(name);
          }
        }

        return {
          suggestions: [...resources].map((name, i) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: 'Resource to import',
            insertText: name,
            range,
            sortText: String(i).padStart(5, '0'),
          })),
        };
      }

      // Auto-complete channel names after "sends event Name to" or "receives event Name from"
      const channelRefMatch = textBeforeCursor.match(/\b(?:sends|receives)\s+(?:event|command|query)\s+[a-zA-Z_][a-zA-Z0-9_.\-]*(?:@[\d]+\.[\d]+\.[\d]+[a-zA-Z0-9_.\-]*)?\s+(?:to|from)\s+(?:.*,\s*)?([a-zA-Z_][a-zA-Z0-9_.\-]*)?$/);
      if (channelRefMatch) {
        const allText = getAllText();
        const channels = collectChannelNames(allText);

        // Also include channel names from parsed AsyncAPI specs
        for (const [, parsed] of getParsedSpecs()) {
          for (const name of parsed.channels.keys()) {
            channels.add(name);
          }
        }

        const summaries = getSpecSummaries('channels');
        const word = model.getWordUntilPosition(position);
        const range = makeRange(position, word);

        return {
          suggestions: [...channels].map((name, i) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: summaries.get(name) || `channel ${name}`,
            insertText: name,
            range,
            sortText: String(i).padStart(5, '0'),
          })),
        };
      }

      // Auto-complete resource names after "sends event", "receives command", etc.
      const sendsReceivesMatch = textBeforeCursor.match(/\b(?:sends|receives)\s+(event|command|query)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)?$/);
      if (sendsReceivesMatch && !sendsReceivesMatch[0].endsWith('@')) {
        const msgType = sendsReceivesMatch[1];
        const pluralType = MESSAGE_TYPE_PLURAL[msgType] || 'events';
        const allText = getAllText();
        const names = collectMessageNames(allText, msgType, pluralType);

        const summaries = getSpecSummaries('messages', names);
        const word = model.getWordUntilPosition(position);
        const range = makeRange(position, word);

        return {
          suggestions: [...names].map((name, i) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: summaries.get(name) || `${msgType} ${name}`,
            insertText: name,
            range,
            sortText: String(i).padStart(5, '0'),
          })),
        };
      }

      // Auto-complete version after "sends event Name@"
      const atMatch = textBeforeCursor.match(/\b(?:sends|receives)\s+(event|command|query)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)@$/);
      if (atMatch) {
        const key = `${atMatch[1]}:${atMatch[2]}`;
        const versions = extractResourceVersions(getAllText()).get(key) || [];

        return {
          suggestions: versions.map((ver, i) => ({
            label: ver,
            kind: monaco.languages.CompletionItemKind.Value,
            detail: `Version ${ver} of ${atMatch[2]}`,
            insertText: ver,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            sortText: String(i).padStart(5, '0'),
          })),
        };
      }

      // For non-import completions, don't suggest inside strings
      const quoteCount = (textBeforeCursor.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 === 1) {
        return { suggestions: [] };
      }

      // Offer annotation completions after '@' inside a resource block
      const annotationMatch = textBeforeCursor.match(/@([a-zA-Z]*)$/);
      if (annotationMatch) {
        const enclosing = findEnclosingResource(textUntilPosition);
        if (enclosing) {
          const typed = annotationMatch[1];
          const annRange = {
            startLineNumber: position.lineNumber,
            startColumn: position.column - typed.length,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          };
          const filtered = typed
            ? ANNOTATION_SUGGESTIONS.filter((ann) => ann.label.replace('@', '').startsWith(typed))
            : ANNOTATION_SUGGESTIONS;
          return {
            suggestions: filtered.map((ann, i) => ({
              label: ann.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: ann.detail,
              insertText: ann.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: annRange,
              filterText: ann.label.replace('@', ''),
              sortText: String(i).padStart(5, '0'),
            })),
          };
        }
      }

      const word = model.getWordUntilPosition(position);
      const range = makeRange(position, word);

      const enclosingResource = findEnclosingResource(textUntilPosition);
      const items = enclosingResource
        ? (CONTEXT_SUGGESTIONS[enclosingResource] || COMMON_PROPS)
        : RESOURCE_KEYWORDS;

      return {
        suggestions: items.map((kw) => ({
          label: kw.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: kw.detail,
          insertText: kw.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });
}
