import { describe, expect, it } from 'vitest';
import { remarkCodeGroup } from '../code-group';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import rehypeExpressiveCode from 'rehype-expressive-code';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';

describe('CodeGroup fenced code', () => {
  it('compiles real MDX fences into separate highlighted panels with copy controls', async () => {
    // Exercise the same MDX compiler dependency that Astro uses.
    const require = createRequire(import.meta.url);
    const mdxRequire = createRequire(require.resolve('@astrojs/mdx'));
    const { evaluate } = await import(pathToFileURL(mdxRequire.resolve('@mdx-js/mdx')).href);
    const source =
      '<CodeGroup>\n\n```js hello.js\nconsole.log("hello");\n```\n\n```python hello.py\nprint("hello")\n```\n\n</CodeGroup>';
    const result = await evaluate(source, {
      ...runtime,
      remarkPlugins: [remarkCodeGroup],
      rehypePlugins: [rehypeExpressiveCode],
    });
    const html = renderToStaticMarkup(runtime.jsx(result.default, { components: { CodeGroup: 'section' } }));
    expect(html).toContain('data-code-panel="hello.js"');
    expect(html).toContain('data-code-panel="hello.py"');
    expect(html).toContain('data-code-lang="python"');
    expect(html.match(/class="expressive-code"/g)).toHaveLength(2);
    expect(html).toContain('data-code=');
  });
  it('extracts filename titles and preserves highlighting modifiers and code', () => {
    const code = { type: 'code', lang: 'js', meta: 'hello.js {2}', value: 'console.log("hello");' };
    const group = { type: 'mdxJsxFlowElement', name: 'CodeGroup', children: [code] };
    remarkCodeGroup()({ type: 'root', children: [group] });
    expect(group.children[0]).toMatchObject({
      name: 'div',
      attributes: [
        { name: 'data-code-panel', value: 'hello.js' },
        { name: 'data-code-lang', value: 'js' },
      ],
      children: [{ ...code, meta: '{2}' }],
    });
  });

  it.each([
    ['"JavaScript example"', 'JavaScript example'],
    ['title="hello.js" {1}', 'hello.js'],
    [null, 'js'],
    ['{1}', 'js'],
  ])('supports title metadata %s', (meta, label) => {
    const group: any = { type: 'mdxJsxFlowElement', name: 'CodeGroup', children: [{ type: 'code', lang: 'js', meta }] };
    remarkCodeGroup()(group);
    expect(group.children[0].attributes[0].value).toBe(label);
  });

  it('does not modify code outside a group', () => {
    const tree = { type: 'root', children: [{ type: 'code', lang: 'js', meta: 'hello.js' }] };
    const before = structuredClone(tree);
    remarkCodeGroup()(tree);
    expect(tree).toEqual(before);
  });
});
