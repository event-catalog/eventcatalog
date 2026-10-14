/**
 * The schema's source, highlighted like the Schema tab on EventCatalog's schema pages.
 * Uses the light build of the highlighter with only the languages schemas are written in, to keep the view small
 * (languages it doesn't have, such as TypeScript, are shown without highlighting).
 */
import { useState } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import protobuf from 'react-syntax-highlighter/dist/esm/languages/prism/protobuf';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import graphql from 'react-syntax-highlighter/dist/esm/languages/prism/graphql';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '@utils/clipboard';
import { SCHEMA_CODE_STYLE } from '../../../../components/SchemaExplorer/utils';

SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('protobuf', protobuf);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('graphql', graphql);

type SchemaCodeProps = {
  code: string;
  /** Language to highlight the code in, from the server (see getLanguageForHighlight) */
  language: string;
  isDark: boolean;
  /** Grows with the code up to this height; fills its container when not set */
  maxHeight?: string;
};

export function SchemaCode({ code, language, isDark, maxHeight }: SchemaCodeProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    setCopyState((await copyToClipboard(code)) ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-code-bg,var(--ec-card-bg)))] ${maxHeight ? '' : 'h-full'}`}
    >
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md bg-[rgb(var(--ec-content-hover)/0.9)] px-2 py-1.5 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] backdrop-blur-xs transition-colors hover:text-[rgb(var(--ec-page-text))]"
      >
        {copyState === 'copied' ? <Check aria-hidden className="h-3 w-3" /> : <Copy aria-hidden className="h-3 w-3" />}
        {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Could not copy' : 'Copy'}
      </button>
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{ ...SCHEMA_CODE_STYLE, ...(maxHeight ? { maxHeight } : { height: '100%' }) }}
        showLineNumbers
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
