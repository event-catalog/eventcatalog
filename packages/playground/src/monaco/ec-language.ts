import type { Monaco } from '@monaco-editor/react';

export function registerEcLanguage(monaco: Monaco) {
  monaco.languages.register({ id: 'ec' });

  monaco.languages.setMonarchTokensProvider('ec', {
    keywords: [
      'domain', 'service', 'event', 'command', 'query', 'channel',
      'container', 'data-product', 'flow', 'diagram', 'user', 'team',
      'sends', 'receives', 'publishes', 'subscribes', 'writes-to', 'reads-from',
      'to', 'from', 'push', 'pull', 'push-pull', 'delivery',
      'version', 'summary', 'owner', 'owners', 'name', 'display-name', 'markdown',
      'step', 'node', 'message', 'actor', 'custom', 'label', 'next', 'id',
      'draft', 'deprecated', 'schema', 'address', 'protocol',
      'parameter',
      'producer', 'consumer', 'route', 'member',
      'subdomain', 'visualizer',
      'legend', 'search', 'toolbar', 'focus-mode', 'style', 'post-it',
      'input', 'output', 'contract',
      'container-type', 'technology', 'authoritative',
      'access-mode', 'classification', 'residency', 'retention',
      'true', 'false', 'required',
      'database', 'cache', 'objectStore', 'searchIndex',
      'dataWarehouse', 'dataLake', 'externalSaaS', 'other',
      'read', 'write', 'readWrite', 'appendOnly',
      'public', 'internal', 'confidential', 'regulated',
    ],

    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/"[^"]*"/, 'string'],
        [/@[a-zA-Z][\w-]*/, 'annotation'],
        [/\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?/, 'number.version'],
        [/[a-zA-Z_][\w-]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        }],
        [/[{}()\[\],:]/, 'delimiter'],
        [/->/, 'operator'],
        [/\s+/, 'white'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
    },
  });

  monaco.editor.defineTheme('ec-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'annotation', foreground: 'c586c0' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'number.version', foreground: 'b5cea8' },
      { token: 'identifier', foreground: '9cdcfe' },
      { token: 'delimiter', foreground: 'd4d4d4' },
      { token: 'operator', foreground: 'd4d4d4' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e1e4e8',
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#e1e4e8',
      'editor.selectionBackground': '#264f78',
      'editor.lineHighlightBackground': '#161b22',
    },
  });
}
