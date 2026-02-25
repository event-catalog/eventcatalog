import type { Monaco } from '@monaco-editor/react';
import type { editor, languages, Position, CancellationToken } from 'monaco-editor';
import { parseSpec } from '@eventcatalog/language-server';

type Suggestion = { label: string; detail: string; insertText: string };

const resourceKeywords: Suggestion[] = [
  { label: 'domain', detail: 'Top-level bounded context', insertText: 'domain ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Bounded context responsible for $1}"\n\n  $0\n}' },
  { label: 'service', detail: 'Microservice or application', insertText: 'service ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Service that manages and processes $1 operations}"\n\n  $0\n}' },
  { label: 'event', detail: 'Domain event', insertText: 'event ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Triggered when a significant change occurs in the domain}"\n}' },
  { label: 'command', detail: 'Command message', insertText: 'command ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Requests an action to be performed in the system}"\n}' },
  { label: 'query', detail: 'Query message', insertText: 'query ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Retrieves data from the system without side effects}"\n}' },
  { label: 'channel', detail: 'Communication channel', insertText: 'channel ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Message channel for routing events between services}"\n  address "${4:topic}"\n\n  $0\n}' },
  { label: 'user', detail: 'User definition', insertText: 'user ${1:username} {\n  name "${2:Full Name}"\n\n  $0\n}' },
  { label: 'team', detail: 'Team definition', insertText: 'team ${1:team-name} {\n  name "${2:Team Name}"\n\n  $0\n}' },
  { label: 'flow', detail: 'Flow definition', insertText: 'flow ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:End-to-end flow describing how messages move through the system}"\n\n  $0\n}' },
  { label: 'container', detail: 'Data container', insertText: 'container ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Data store that persists and manages $1 data}"\n\n  $0\n}' },
  { label: 'data-product', detail: 'Data product', insertText: 'data-product ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Data product that provides curated data for consumers}"\n\n  $0\n}' },
  { label: 'visualizer', detail: 'Visualizer view', insertText: 'visualizer ${1:main} {\n  name "${2:View Name}"\n\n  $0\n}' },
  { label: 'actor', detail: 'Human actor (for flows)', insertText: 'actor ${1:Name} {\n  name "${2:Display Name}"\n  summary "${3:User or persona that interacts with the system}"\n}' },
  { label: 'external-system', detail: 'External system (for flows)', insertText: 'external-system ${1:Name} {\n  name "${2:Display Name}"\n  summary "${3:Third-party system that integrates with the platform}"\n}' },
];

const commonProps: Suggestion[] = [
  { label: 'version', detail: 'Semantic version', insertText: 'version ${1:1.0.0}' },
  { label: 'name', detail: 'Display name', insertText: 'name "${1:Display Name}"' },
  { label: 'summary', detail: 'Short description', insertText: 'summary "${1:description}"' },
  { label: 'owner', detail: 'Owner reference', insertText: 'owner ${1:team}' },
  { label: 'deprecated', detail: 'Mark as deprecated', insertText: 'deprecated true' },
  { label: 'draft', detail: 'Mark as draft', insertText: 'draft true' },
];

const annotationSuggestions: Suggestion[] = [
  { label: '@badge', detail: 'Visual badge', insertText: 'badge("${1:label}", bg: "${2:#22c55e}", text: "${3:#fff}")' },
  { label: '@note', detail: 'Developer note or reminder', insertText: 'note("${1:note text}")' },
  { label: '@note (with params)', detail: 'Note with author and priority', insertText: 'note("${1:note text}", author: "${2:name}", priority: "${3|low,medium,high|}")' },
  { label: '@repository', detail: 'Source code repository', insertText: 'repository(url: "${1:https://github.com/...}", language: "${2:TypeScript}")' },
  { label: '@specification', detail: 'API specification', insertText: 'specification(type: ${1|openapi,asyncapi,graphql|}, path: "${2:./spec.yml}")' },
];

const contextSuggestions: Record<string, Suggestion[]> = {
  service: [
    ...commonProps,
    { label: 'sends', detail: 'Service sends a message', insertText: 'sends ${1|event,command,query|} ${2:Name}' },
    { label: 'receives', detail: 'Service receives a message', insertText: 'receives ${1|event,command,query|} ${2:Name}' },
    { label: 'writes-to', detail: 'Writes to a container', insertText: 'writes-to ${1:container}' },
    { label: 'reads-from', detail: 'Reads from a container', insertText: 'reads-from ${1:container}' },
  ],
  domain: [
    ...commonProps,
    { label: 'service', detail: 'Nested service', insertText: 'service ${1:Name} {\n  version ${2:1.0.0}\n\n  $0\n}' },
    { label: 'subdomain', detail: 'Nested subdomain', insertText: 'subdomain ${1:Name} {\n  version ${2:1.0.0}\n\n  $0\n}' },
  ],
  event: [
    ...commonProps,
    { label: 'schema', detail: 'Schema path', insertText: 'schema "${1:path}"' },
  ],
  command: [
    ...commonProps,
    { label: 'schema', detail: 'Schema path', insertText: 'schema "${1:path}"' },
  ],
  query: [
    ...commonProps,
    { label: 'schema', detail: 'Schema path', insertText: 'schema "${1:path}"' },
  ],
  channel: [
    ...commonProps,
    { label: 'address', detail: 'Channel address/topic', insertText: 'address "${1:topic}"' },
    { label: 'protocol', detail: 'Channel protocol', insertText: 'protocol "${1:protocol}"' },
    { label: 'route', detail: 'Route to another channel', insertText: 'route ${1:ChannelName}' },
  ],
  user: [
    { label: 'name', detail: 'Display name', insertText: 'name "${1:Full Name}"' },
    { label: 'avatar', detail: 'Avatar URL', insertText: 'avatar "${1:https://example.com/avatar.png}"' },
    { label: 'role', detail: 'User role', insertText: 'role "${1:role}"' },
  ],
  team: [
    { label: 'name', detail: 'Team display name', insertText: 'name "${1:Team Name}"' },
    { label: 'avatar', detail: 'Avatar URL', insertText: 'avatar "${1:https://example.com/avatar.png}"' },
    { label: 'role', detail: 'Team role', insertText: 'role "${1:role}"' },
    { label: 'member', detail: 'Team member', insertText: 'member ${1:username}' },
  ],
  flow: [
    ...commonProps,
    { label: 'entry chain', detail: 'Starting arrow chain', insertText: '${1:Source} "${2:description}" -> ${3:Target}' },
    { label: 'when block', detail: 'React to an event', insertText: 'when ${1:TriggerName}\n  ${2:ServiceName} "${3:description}"\n    -> ${0:OutputName}' },
    { label: 'when (convergence)', detail: 'React to multiple events', insertText: 'when ${1:EventA} and ${2:EventB}\n  ${3:ServiceName} "${4:description}"\n    -> ${0:OutputName}' },
    { label: 'labeled output', detail: 'Output with label', insertText: '-> "${1:label}": ${2:TargetName}' },
  ],
  container: [
    ...commonProps,
    { label: 'container-type', detail: 'Type of container', insertText: 'container-type ${1|database,cache,objectStore,searchIndex,dataWarehouse,dataLake,externalSaaS,other|}' },
    { label: 'technology', detail: 'Technology/implementation', insertText: 'technology "${1:postgres@14}"' },
    { label: 'authoritative', detail: 'Authoritative source', insertText: 'authoritative ${1|true,false|}' },
    { label: 'access-mode', detail: 'Access pattern', insertText: 'access-mode ${1|read,write,readWrite,appendOnly|}' },
    { label: 'classification', detail: 'Data classification', insertText: 'classification ${1|public,internal,confidential,regulated|}' },
    { label: 'residency', detail: 'Data residency', insertText: 'residency "${1:region}"' },
    { label: 'retention', detail: 'Data retention policy', insertText: 'retention "${1:policy}"' },
  ],
  'data-product': [
    ...commonProps,
    { label: 'input', detail: 'Input data source', insertText: 'input ${1|event,command,query|} ${2:ResourceName}' },
    { label: 'output', detail: 'Output dataset', insertText: 'output ${1|event,command,query|} ${2:DatasetName}' },
    { label: 'output (with contract)', detail: 'Output with schema contract', insertText: 'output ${1|event,command,query|} ${2:DatasetName} {\n  contract {\n    path "${3:./schemas/schema.json}"\n    name "${4:SchemaName}"\n    type "${5:json-schema}"\n  }\n}' },
  ],
  actor: [
    { label: 'name', detail: 'Display name', insertText: 'name "${1:Display Name}"' },
    { label: 'summary', detail: 'Short description', insertText: 'summary "${1:description}"' },
  ],
  'external-system': [
    { label: 'name', detail: 'Display name', insertText: 'name "${1:Display Name}"' },
    { label: 'summary', detail: 'Short description', insertText: 'summary "${1:description}"' },
  ],
  visualizer: [
    { label: 'name', detail: 'Display name', insertText: 'name "${1:View Name}"' },
    { label: 'summary', detail: 'Short description', insertText: 'summary "${1:description}"' },
    { label: 'legend', detail: 'Show/hide legend', insertText: 'legend ${1|true,false|}' },
    { label: 'search', detail: 'Show/hide search', insertText: 'search ${1|true,false|}' },
    { label: 'toolbar', detail: 'Show/hide toolbar', insertText: 'toolbar ${1|true,false|}' },
    { label: 'focus-mode', detail: 'Enable/disable focus mode', insertText: 'focus-mode ${1|true,false|}' },
    { label: 'animated', detail: 'Simulate message flow animation', insertText: 'animated ${1|true,false|}' },
    { label: 'style', detail: 'Node rendering style', insertText: 'style ${1|default,post-it|}' },
    { label: 'service', detail: 'Include a service', insertText: 'service ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Service that manages and processes $1 operations}"\n\n  $0\n}' },
    { label: 'domain', detail: 'Include a domain', insertText: 'domain ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Bounded context responsible for $1}"\n\n  $0\n}' },
    { label: 'event', detail: 'Include an event', insertText: 'event ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Triggered when a significant change occurs in the domain}"\n}' },
    { label: 'command', detail: 'Include a command', insertText: 'command ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Requests an action to be performed in the system}"\n}' },
    { label: 'query', detail: 'Include a query', insertText: 'query ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Retrieves data from the system without side effects}"\n}' },
    { label: 'channel', detail: 'Include a channel', insertText: 'channel ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Message channel for routing events between services}"\n  address "${4:topic}"\n\n  $0\n}' },
    { label: 'container', detail: 'Include a container', insertText: 'container ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:Data store that persists and manages $1 data}"\n}' },
    { label: 'flow', detail: 'Include a flow', insertText: 'flow ${1:Name} {\n  version ${2:1.0.0}\n  summary "${3:End-to-end flow describing how messages move through the system}"\n}' },
  ],
};

function findEnclosingResource(text: string): string | null {
  const stack: string[] = [];
  const tokenRegex = /\b(domain|service|event|command|query|channel|user|team|flow|container|data-product|subdomain|visualizer|actor|external-system)\b(?:[^{}]|\{[a-zA-Z0-9_]+\})*\{|\{|\}/g;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    if (token === '}') {
      stack.pop();
    } else if (token === '{') {
      stack.push('unknown');
    } else {
      stack.push(match[1]);
    }
  }

  if (stack.length === 0) return null;
  const top = stack[stack.length - 1];
  return top === 'subdomain' ? 'domain' : top;
}

function extractResourceVersions(text: string): Map<string, string[]> {
  const versions = new Map<string, string[]>();
  const resourceTypes = ['event', 'command', 'query', 'channel', 'service', 'domain', 'flow', 'container', 'data-product'];

  for (const type of resourceTypes) {
    const defRegex = new RegExp(
      `\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_.{}\\-]*)\\s*\\{[^}]*?version\\s+(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9_.]+)*)`,
      'g'
    );
    let match;
    while ((match = defRegex.exec(text)) !== null) {
      const key = `${type}:${match[1]}`;
      const arr = versions.get(key) ?? [];
      if (!arr.includes(match[2])) arr.push(match[2]);
      versions.set(key, arr);
    }

    const inlineRegex = new RegExp(
      `\\b(?:sends|receives)\\s+${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{[^}]*?version\\s+(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9_.]+)*)`,
      'g'
    );
    while ((match = inlineRegex.exec(text)) !== null) {
      const key = `${type}:${match[1]}`;
      const arr = versions.get(key) ?? [];
      if (!arr.includes(match[2])) arr.push(match[2]);
      versions.set(key, arr);
    }
  }

  return versions;
}

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
      if (isYamlFile(filename)) {
        try {
          _cachedSpecParsed.set(filename, parseSpec(content));
        } catch { /* skip invalid specs */ }
      }
    }
    for (const [url, content] of _fetchedSpecCache) {
      try {
        _cachedSpecParsed.set(url, parseSpec(content));
      } catch { /* skip invalid specs */ }
    }
  }
  return _cachedSpecParsed;
}

function isYamlFile(filename: string): boolean {
  return filename.endsWith('.yml') || filename.endsWith('.yaml');
}

// ─── Shared helpers for completion handlers ─────────────

function lookupSpecContent(specPath: string): string | undefined {
  const normalizedPath = specPath.replace(/^\.\//, '');
  return _allFilesSources[specPath]
    ?? _allFilesSources[normalizedPath]
    ?? _allFilesSources[`./${normalizedPath}`]
    ?? _fetchedSpecCache.get(specPath);
}

function collectRegexMatches(pattern: RegExp, text: string): string[] {
  const results: string[] = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    results.push(m[1]);
  }
  return results;
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
      const importFromMatch = textBeforeCursor.match(/import\s+(?:(?:events|commands|queries|channels)\s+)?\{[^}]*\}\s*from\s*"([^"]*)$/);
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
      // Supports both plain `import { ... }` and typed `import events { ... } from "spec.yml"`
      const importBracesMatch = textBeforeCursor.match(/import\s+(?:(events|commands|queries|channels)\s+)?\{([^}]*)$/);
      if (importBracesMatch) {
        const word = model.getWordUntilPosition(position);
        const range = makeRange(position, word);
        const resourceKind = importBracesMatch[1] as 'events' | 'commands' | 'queries' | 'channels' | undefined;
        const alreadyImported = new Set(
          (importBracesMatch[2] || '').split(',').map(s => s.trim()).filter(Boolean)
        );

        // Check if the full line references a .yml/.yaml file (AsyncAPI spec)
        const fromSpecMatch = lineContent.match(/from\s*"([^"]+\.ya?ml)"/);

        if (resourceKind && fromSpecMatch) {
          const specContent = lookupSpecContent(fromSpecMatch[1]);
          if (specContent) {
            try {
              const parsed = parseSpec(specContent);
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
        const channels = new Set([
          ...collectRegexMatches(/\bchannel\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)\s*\{/g, allText),
          ...collectRegexMatches(/\b(?:sends|receives)\s+(?:event|command|query)\s+[a-zA-Z_][a-zA-Z0-9_.\-]*(?:@[^\s]*)?\s+(?:to|from)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)/g, allText),
          ...collectRegexMatches(/import\s+channels\s*\{([^}]*)\}\s*from\s*"[^"]+"/g, allText)
            .flatMap(match => match.split(',').map(s => s.trim()).filter(Boolean)),
        ]);

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
        const pluralType = msgType === 'event' ? 'events' : msgType === 'command' ? 'commands' : 'queries';
        const allText = getAllText();

        const names = new Set([
          ...collectRegexMatches(new RegExp(`\\b${msgType}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{`, 'g'), allText),
          ...collectRegexMatches(new RegExp(`\\b(?:sends|receives)\\s+${msgType}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)`, 'g'), allText),
          ...collectRegexMatches(new RegExp(`import\\s+${pluralType}\\s*\\{([^}]*)\\}\\s*from\\s*"[^"]+"`, 'g'), allText)
            .flatMap(match => match.split(',').map(s => s.trim()).filter(Boolean)),
        ]);

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
            ? annotationSuggestions.filter((ann) => ann.label.replace('@', '').startsWith(typed))
            : annotationSuggestions;
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
        ? (contextSuggestions[enclosingResource] || commonProps)
        : resourceKeywords;

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
