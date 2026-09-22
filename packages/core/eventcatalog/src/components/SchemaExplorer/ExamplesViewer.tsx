import { createContext, useContext, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { copyToClipboard } from './utils';
import type { MessageExample } from './types';
import { useDarkMode } from './useDarkMode';
import { remarkMarkdownCodeGroup } from '../../remark-plugins/markdown-code-group';
import { MarkdownCodeGroup } from '../MDX/CodeGroup/MarkdownCodeGroup';
import { MarkdownColumns, MarkdownColumn } from '../MDX/Columns/MarkdownColumns';
import { remarkMarkdownColumns } from '../../remark-plugins/markdown-columns';
import { getLanguageForHighlight } from './utils';

interface ExamplesViewerProps {
  examples: MessageExample[];
}

const PROSE_CLASS = [
  'prose prose-sm max-w-none',
  'prose-headings:text-[rgb(var(--ec-page-text))] prose-h1:mt-0 prose-h1:text-4xl prose-h1:font-bold prose-h1:tracking-tight',
  'prose-p:text-[rgb(var(--ec-page-text-muted))] prose-li:text-[rgb(var(--ec-page-text-muted))] prose-strong:text-[rgb(var(--ec-page-text))]',
  'prose-a:text-[rgb(var(--ec-accent))] prose-table:text-[rgb(var(--ec-page-text-muted))] prose-th:text-[rgb(var(--ec-page-text))]',
  'prose-blockquote:border-[rgb(var(--ec-page-border))] prose-blockquote:text-[rgb(var(--ec-page-text-muted))] prose-hr:border-[rgb(var(--ec-page-border))]',
].join(' ');

const getCodeText = (children: ReactNode): string =>
  Array.isArray(children) ? children.map(getCodeText).join('') : typeof children === 'string' ? children : '';

/** True while rendering inside a CodeGroup panel, where the group supplies the header and copy button. */
const CodeGroupPanelContext = createContext(false);

/** Fenced code block rendered as the same themed code panel used across the schema page. */
function CodeBlock({ language, code }: { language?: string; code: string }) {
  const isDarkMode = useDarkMode();
  const [isCopied, setIsCopied] = useState(false);
  const inCodeGroup = useContext(CodeGroupPanelContext);
  const content = code.replace(/\s+$/, '');
  const highlighter = (
    <SyntaxHighlighter
      language={language || 'text'}
      style={isDarkMode ? oneDark : oneLight}
      customStyle={{
        margin: 0,
        padding: '1rem 1.25rem',
        borderRadius: 0,
        fontSize: '0.8125rem',
        lineHeight: '1.65',
        background: 'transparent',
      }}
      showLineNumbers={content.includes('\n')}
      wrapLines={true}
      wrapLongLines={true}
    >
      {content}
    </SyntaxHighlighter>
  );

  // Inside a group the panel chrome (file name, language picker, copy) belongs to the group.
  // Keep the raw source on a data attribute so the group's copy button gets clean text.
  if (inCodeGroup) {
    return (
      <div data-code={content} className="not-prose max-h-[70vh] overflow-auto">
        {highlighter}
      </div>
    );
  }

  const handleCopy = async () => {
    if (await copyToClipboard(content)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div
      data-example-code-block
      className="not-prose my-4 overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-code-bg))] shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover)/0.45)] px-3 py-1.5">
        <span className="rounded-md bg-[rgb(var(--ec-content-hover))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            isCopied
              ? 'text-emerald-500'
              : 'text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]'
          }`}
          title="Copy code"
        >
          {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="max-h-[70vh] overflow-auto">{highlighter}</div>
    </div>
  );
}

const markdownComponents = {
  div: ({ node: _node, children, ...props }: any) =>
    props['data-columns'] ? (
      <MarkdownColumns cols={Number(props['data-cols'])} ratio={props['data-ratio']} className={props.className}>
        {children}
      </MarkdownColumns>
    ) : props['data-column'] ? (
      <MarkdownColumn sticky={props['data-sticky'] === 'true'} className={props.className}>
        {children}
      </MarkdownColumn>
    ) : props['data-code-group'] ? (
      <MarkdownCodeGroup dropdown={props['data-dropdown'] === 'true'} className={props.className}>
        {children}
      </MarkdownCodeGroup>
    ) : props['data-code-panel'] ? (
      <div {...props}>
        <CodeGroupPanelContext.Provider value={true}>{children}</CodeGroupPanelContext.Provider>
      </div>
    ) : (
      <div {...props}>{children}</div>
    ),
  // Fenced blocks arrive as <pre><code class="language-x">. Render the panel from `code` and drop the <pre>.
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    const language = /language-(\w+)/.exec(className || '')?.[1];
    const text = getCodeText(children);
    if (language || text.includes('\n')) return <CodeBlock language={language} code={text} />;
    return (
      <code className="rounded bg-[rgb(var(--ec-content-hover)/0.6)] px-1.5 py-0.5 font-mono text-[12px] font-normal text-[rgb(var(--ec-page-text))] before:content-none after:content-none">
        {children}
      </code>
    );
  },
};

/** Lists every usage example, rendering Markdown as prose and other formats as source. */
export default function ExamplesViewer({ examples }: ExamplesViewerProps) {
  if (examples.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
        <p className="text-sm">No examples available</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="divide-y divide-[rgb(var(--ec-page-border))]">
        {examples.map((example) => (
          <section
            key={example.fileName}
            id={`example-${example.fileName.replace(/[^a-zA-Z0-9]+/g, '-')}`}
            className="w-full py-8 pr-8 first:pt-0 last:pb-0"
          >
            {example.summary && <p className="mb-4 text-sm text-[rgb(var(--ec-page-text-muted))]">{example.summary}</p>}
            {example.renderMode === 'markdown' ? (
              <div className={PROSE_CLASS}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMarkdownColumns, remarkMarkdownCodeGroup]}
                  components={markdownComponents}
                >
                  {example.content}
                </ReactMarkdown>
              </div>
            ) : (
              <CodeBlock language={getLanguageForHighlight(example.extension)} code={example.content} />
            )}
            {example.usage && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">Usage</h3>
                <CodeBlock language="bash" code={example.usage} />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
