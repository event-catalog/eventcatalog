import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getLanguageForHighlight } from '@components/SchemaExplorer/utils';

interface PrintSchemaViewerProps {
  content: string;
  format: string;
  extension: string;
}

export default function PrintSchemaViewer({ content, format, extension }: PrintSchemaViewerProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        {format}
      </div>
      <SyntaxHighlighter
        language={getLanguageForHighlight(extension)}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          borderRadius: 0,
          fontSize: '0.8rem',
          lineHeight: '1.6',
          background: '#fafbfc',
        }}
        showLineNumbers={true}
        wrapLines={true}
        wrapLongLines={true}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}
