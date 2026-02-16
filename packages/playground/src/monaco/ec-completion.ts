import type { Monaco } from '@monaco-editor/react';
import type { editor, languages, Position, CancellationToken } from 'monaco-editor';

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
  const tokenRegex = /\b(domain|service|event|command|query|channel|user|team|flow|container|data-product|subdomain|visualizer|actor|external-system)\b[^{}]*\{|\{|\}/g;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    if (token === '}') {
      stack.pop();
    } else if (token === '{') {
      stack.push('unknown');
    } else {
      const keyword = match[1];
      stack.push(keyword);
    }
  }

  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top === 'subdomain') return 'domain';
    return top;
  }
  return null;
}

function extractResourceVersions(text: string): Map<string, string[]> {
  const versions = new Map<string, string[]>();
  const resourceTypes = ['event', 'command', 'query', 'channel', 'service', 'domain', 'flow', 'container', 'data-product'];

  for (const type of resourceTypes) {
    const defRegex = new RegExp(
      `\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{[^}]*?version\\s+(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9_.]+)*)`,
      'g'
    );
    let match;
    while ((match = defRegex.exec(text)) !== null) {
      const name = match[1];
      const ver = match[2];
      const key = `${type}:${name}`;
      if (!versions.has(key)) versions.set(key, []);
      const arr = versions.get(key)!;
      if (!arr.includes(ver)) arr.push(ver);
    }

    const inlineRegex = new RegExp(
      `\\b(?:sends|receives)\\s+${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{[^}]*?version\\s+(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9_.]+)*)`,
      'g'
    );
    while ((match = inlineRegex.exec(text)) !== null) {
      const name = match[1];
      const ver = match[2];
      const key = `${type}:${name}`;
      if (!versions.has(key)) versions.set(key, []);
      const arr = versions.get(key)!;
      if (!arr.includes(ver)) arr.push(ver);
    }
  }

  return versions;
}

let _allFilesSources: Record<string, string> = {};

export function setAllFilesSources(files: Record<string, string>) {
  _allFilesSources = files;
}

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
      const importFromMatch = textBeforeCursor.match(/import\s*\{[^}]*\}\s*from\s*"([^"]*)$/);
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
      const importBracesMatch = textBeforeCursor.match(/import\s*\{([^}]*)$/);
      if (importBracesMatch) {
        const allText = Object.values(_allFilesSources).join('\n');
        const resourceTypes = ['service', 'event', 'command', 'query', 'domain', 'channel', 'flow', 'container'];
        const resources = new Set<string>();

        for (const type of resourceTypes) {
          const defRegex = new RegExp(
            `\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{`,
            'g'
          );
          let match;
          while ((match = defRegex.exec(allText)) !== null) {
            resources.add(match[1]);
          }
        }

        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        return {
          suggestions: Array.from(resources).map((resourceName, i) => ({
            label: resourceName,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: 'Resource to import',
            insertText: resourceName,
            range,
            sortText: String(i).padStart(5, '0'),
          })),
        };
      }

      const atMatch = textBeforeCursor.match(/\b(?:sends|receives)\s+(event|command|query)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)@$/);
      if (atMatch) {
        const msgType = atMatch[1];
        const msgName = atMatch[2];
        const key = `${msgType}:${msgName}`;

        const allText = Object.values(_allFilesSources).join('\n');
        const allVersions = extractResourceVersions(allText);
        const versions = allVersions.get(key) || [];

        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        return {
          suggestions: versions.map((ver, i) => ({
            label: ver,
            kind: monaco.languages.CompletionItemKind.Value,
            detail: `Version ${ver} of ${msgName}`,
            insertText: ver,
            range,
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
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const enclosingResource = findEnclosingResource(textUntilPosition);
      const suggestions: languages.CompletionItem[] = [];

      if (!enclosingResource) {
        for (const kw of resourceKeywords) {
          suggestions.push({
            label: kw.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: kw.detail,
            insertText: kw.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          });
        }
      } else {
        const items = contextSuggestions[enclosingResource] || commonProps;
        for (const kw of items) {
          suggestions.push({
            label: kw.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: kw.detail,
            insertText: kw.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          });
        }
      }

      return { suggestions };
    },
  });
}
