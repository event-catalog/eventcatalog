import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as runtime from 'react/jsx-runtime';
import { getColumnsLayout } from './layout';
import { MarkdownColumns, MarkdownColumn } from './MarkdownColumns';
import { remarkMarkdownColumns } from '../../../remark-plugins/markdown-columns';
import { remarkMarkdownCodeGroup } from '../../../remark-plugins/markdown-code-group';

const source =
  '<Columns cols={2} ratio="2:1">\n  <Column>\n\n## Publish an order\n\nSome **explanation**.\n\n  </Column>\n  <Column sticky>\n\n<CodeGroup>\n\n```json OrderCreated\n{"id":"123"}\n```\n\n```js JavaScript\npublish();\n```\n\n</CodeGroup>\n\n  </Column>\n</Columns>';

describe('Columns', () => {
  it('defaults to two columns and supports one through four', () => {
    expect(getColumnsLayout().template).toBe('repeat(2, minmax(0, 1fr))');
    for (const count of [1, 2, 3, 4]) expect(getColumnsLayout(count).count).toBe(count);
  });
  it('uses valid ratios and safely falls back for invalid options', () => {
    expect(getColumnsLayout(2, '2:1').template).toBe('minmax(0, 2fr) minmax(0, 1fr)');
    for (const ratio of ['0:1', '-1:2', 'NaN:1', '1:2:3', '1fr:2fr', 'Infinity:1']) {
      expect(getColumnsLayout(2, ratio).template).toBe('repeat(2, minmax(0, 1fr))');
    }
    for (const count of [0, 5, 1.5, NaN]) expect(getColumnsLayout(count).count).toBe(2);
  });
  it('renders the same API as real MDX with rich content and nested components', async () => {
    const require = createRequire(import.meta.url);
    const mdxRequire = createRequire(require.resolve('@astrojs/mdx'));
    const { evaluate } = await import(pathToFileURL(mdxRequire.resolve('@mdx-js/mdx')).href);
    const result = await evaluate(source, runtime);
    const html = renderToStaticMarkup(
      runtime.jsx(result.default, {
        components: {
          Columns: MarkdownColumns,
          Column: MarkdownColumn,
          CodeGroup: 'section',
        },
      })
    );
    expect(html).toContain('--ec-columns-template:minmax(0, 2fr) minmax(0, 1fr)');
    expect(html).toContain('data-sticky="true"');
    expect(html).toContain('<strong>explanation</strong>');
    expect(html).toContain('language-json');
  });
  it('recognizes adjacent layout tags in Markdown and lets CodeGroup transform within columns', () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown remarkPlugins={[remarkMarkdownColumns, remarkMarkdownCodeGroup]}>{source}</ReactMarkdown>
    );
    expect(html).toContain('data-columns="true"');
    expect(html.match(/data-column="true"/g)).toHaveLength(2);
    expect(html).toContain('data-cols="2"');
    expect(html).toContain('data-ratio="2:1"');
    expect(html).toContain('data-sticky="true"');
    expect(html).toContain('data-code-panel="OrderCreated"');
    expect(html).toContain('<strong>explanation</strong>');
    expect(html).not.toContain('&lt;Column');
  });
  it('preserves nested column layouts and leaves unrelated HTML escaped', () => {
    const nested =
      '<Columns>\n\n<Column>\n\n<Columns cols={1}>\n\n<Column>\n\nInner\n\n</Column>\n\n</Columns>\n\n</Column>\n\n</Columns>\n\n<script>alert(1)</script>';
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkMarkdownColumns]}>{nested}</ReactMarkdown>);
    expect(html.match(/data-columns="true"/g)).toHaveLength(2);
    expect(html).not.toContain('<script>');
  });
});
