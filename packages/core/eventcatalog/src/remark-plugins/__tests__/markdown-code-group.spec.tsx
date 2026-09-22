// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { remarkMarkdownCodeGroup } from '../markdown-code-group';

describe('CodeGroup in Markdown examples', () => {
  it('turns the Order Created example syntax into panels while preserving surrounding content', () => {
    const markdown =
      "## Hello\n\n<CodeGroup>\n\n  ```javascript hello.js\n  console.log('Hello');\n  ```\n\n  ```python hello.py\n  print('Hello')\n  ```\n\n</CodeGroup>\n\nAfter the group.";
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkMarkdownCodeGroup]}>{markdown}</ReactMarkdown>);
    const documentRoot = document.createElement('div');
    documentRoot.innerHTML = html;
    const group = documentRoot.querySelector<HTMLElement>('[data-code-group]')!;
    expect(group).not.toBeNull();
    expect(group.querySelectorAll('[data-code-panel]')).toHaveLength(2);
    expect(group.textContent).toContain("console.log('Hello');");
    expect(documentRoot.textContent).toContain('After the group.');
    expect(documentRoot.textContent).not.toContain('<CodeGroup>');
  });

  it('supports dropdown and quoted labels without rendering arbitrary HTML', () => {
    const markdown =
      '<CodeGroup dropdown className="custom">\n\n```js "JavaScript example"\nhello\n```\n\n</CodeGroup>\n\n<script>alert(1)</script>';
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkMarkdownCodeGroup]}>{markdown}</ReactMarkdown>);
    expect(html).toContain('data-dropdown="true"');
    expect(html).toContain('data-code-panel="JavaScript example"');
    expect(html).not.toContain('<script>');
  });

  it('leaves unclosed groups readable', () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown remarkPlugins={[remarkMarkdownCodeGroup]}>{'<CodeGroup>\n\n```js\nhello\n```'}</ReactMarkdown>
    );
    expect(html).not.toContain('data-code-group');
    expect(html).toContain('hello');
  });
});
