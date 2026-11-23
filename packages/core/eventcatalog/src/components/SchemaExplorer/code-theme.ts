import type { CSSProperties } from 'react';

/**
 * The code theme for schemas, specifications and examples: quiet, like Vercel's. Mostly the text colour, with keys in
 * blue, strings in green and keywords, numbers and booleans in pink, and nothing in italics. The colours are CSS
 * variables (--ec-code-token-*, in tailwind.css), so the one theme follows light and dark mode with no flash
 */
const token = (name: string) => `rgb(var(--ec-code-token-${name}))`;

const base: CSSProperties = {
  color: token('text'),
  background: 'none',
  fontFamily: 'var(--font-mono)',
  textAlign: 'left',
  whiteSpace: 'pre',
  wordSpacing: 'normal',
  wordBreak: 'normal',
  wordWrap: 'normal',
  tabSize: 2,
  hyphens: 'none',
};

export const codeTheme: Record<string, CSSProperties> = {
  'code[class*="language-"]': base,
  'pre[class*="language-"]': { ...base, overflow: 'auto' },

  // The line numbers have the comment class too
  comment: { color: token('comment') },
  prolog: { color: token('comment') },
  cdata: { color: token('comment') },
  doctype: { color: token('comment') },

  punctuation: { color: token('punctuation') },
  operator: { color: token('punctuation') },

  property: { color: token('key') },
  'attr-name': { color: token('key') },
  tag: { color: token('key') },
  selector: { color: token('key') },

  string: { color: token('string') },
  char: { color: token('string') },
  'attr-value': { color: token('string') },
  url: { color: token('string') },
  inserted: { color: token('string') },

  keyword: { color: token('keyword') },
  boolean: { color: token('keyword') },
  number: { color: token('keyword') },
  constant: { color: token('keyword') },
  symbol: { color: token('keyword') },
  atrule: { color: token('keyword') },
  important: { color: token('keyword') },
  deleted: { color: token('keyword') },
  '.language-json .token.null.keyword': { color: token('keyword') },

  function: { color: token('function') },
  'class-name': { color: token('function') },
  builtin: { color: token('function') },
  regex: { color: token('function') },
  variable: { color: token('text') },
  namespace: { opacity: 0.7 },

  bold: { fontWeight: 600 },
  italic: { fontStyle: 'normal' },
};
