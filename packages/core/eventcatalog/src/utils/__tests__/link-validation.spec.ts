import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { formatBrokenLinks, validateBuiltLinks } from '../link-validation';

let outDir: string;
const write = async (file: string, content: string) => {
  await fs.mkdir(path.dirname(path.join(outDir, file)), { recursive: true });
  await fs.writeFile(path.join(outDir, file), content);
};

beforeEach(async () => {
  outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-links-'));
});
afterEach(async () => {
  await fs.rm(outDir, { recursive: true, force: true });
});

describe('validateBuiltLinks', () => {
  it('checks actual generated pages and downloads with relative URLs, base paths, queries and trailing slashes', async () => {
    await write(
      'docs/start/index.html',
      `<a href="../next/">Next</a><a href="/catalog/docs/next?tab=1&amp;view=2">Next</a>
       <a href="/catalog/docs/next/index.html">HTML</a><a href="../../schema.json">Schema</a>
       <a href="/catalog">Home</a><a href="https://catalog.example/catalog/docs/next/">Absolute</a>`
    );
    await write('index.html', 'Home');
    await write('docs/next/index.html', 'Next');
    await write('schema.json', '{}');
    expect(await validateBuiltLinks({ outDir, base: '/catalog/', site: 'https://catalog.example' })).toEqual({
      pages: 3,
      diagnostics: [],
    });
  });

  it('reports missing targets once per source page and suggests existing resource collections', async () => {
    await write(
      'index.html',
      `<a href="/docs/events/create-order/1.0.0">One</a><a href="/docs/events/create-order/1.0.0?view=2">Two</a>
       <a href="/docs/users/platform">Owner</a>`
    );
    await write('docs/commands/create-order/1.0.0/index.html', 'Command');
    await write('docs/teams/platform/index.html', 'Team');
    expect((await validateBuiltLinks({ outDir })).diagnostics).toEqual([
      {
        kind: 'link',
        source: '/',
        destination: '/docs/events/create-order/1.0.0',
        suggestion: '/docs/commands/create-order/1.0.0',
      },
      { kind: 'link', source: '/', destination: '/docs/users/platform', suggestion: '/docs/teams/platform' },
    ]);
  });

  it('checks HTML ids and legacy named anchors, including encoded fragments and HTML entities', async () => {
    await write(
      'index.html',
      `<a href='/guide/#caf%C3%A9'>Unicode</a><a href='/guide/#a&amp;b'>Entity</a>
       <a href=/guide/#legacy>Legacy</a><a href='/guide/#missing'>Missing</a>
       <a href='/guide/#top'>Top</a><a href='/guide/#'>Empty</a>
       <a href='/guide/#:~:text=word'>Text fragment</a><a href='/guide/#legacy:~:text=word'>Named text fragment</a>`
    );
    await write('guide/index.html', '<h2 id="café">Title</h2><p id="a&amp;b"></p><a name="legacy"></a>');
    expect((await validateBuiltLinks({ outDir })).diagnostics).toEqual([
      { kind: 'anchor', source: '/', destination: '/guide/#missing' },
    ]);
  });

  it('does not invent links or anchor targets from scripts, comments, or inert templates', async () => {
    await write(
      'index.html',
      `<script>const html = '<a href="/script-link">';</script><!-- <a href="/comment-link"> -->
       <template><a href="/template-link" id="inert">Template</a></template>
       <a href="#inert">Missing target</a><a title="a > b" href="/real-missing">Real link</a>`
    );
    expect((await validateBuiltLinks({ outDir })).diagnostics).toEqual([
      { kind: 'anchor', source: '/', destination: '/#inert' },
      { kind: 'link', source: '/', destination: '/real-missing' },
    ]);
  });

  it('resolves links using the first HTML base element', async () => {
    await write('index.html', '<base href="/nested/"><base href="/wrong/"><a href="page/#title">Page</a>');
    await write('nested/page/index.html', '<h1 id="title">Page</h1>');
    expect((await validateBuiltLinks({ outDir })).diagnostics).toEqual([]);
  });

  it('ignores external URLs, non-HTTP schemes, and paths outside the catalog base without fetching them', async () => {
    await write(
      'index.html',
      `<a href="https://elsewhere.example/missing">External</a><a href="//elsewhere.example/">Protocol relative</a>
       <a href="mailto:person@example.com">Mail</a><a href="tel:123">Call</a><a href="javascript:void(0)">Action</a>
       <a href="/other-app">Outside base</a><a href="https://catalog.example/other-app">Outside base absolute</a>`
    );
    expect((await validateBuiltLinks({ outDir, base: '/catalog', site: 'https://catalog.example' })).diagnostics).toEqual([]);
  });

  it('matches ignore globs against destination paths relative to the catalog base', async () => {
    await write('index.html', '<a href="/catalog/api/runtime?x=1#part">API</a><a href="/catalog/missing">Missing</a>');
    expect((await validateBuiltLinks({ outDir, base: '/catalog', ignore: ['/api/**'] })).diagnostics).toEqual([
      { kind: 'link', source: '/catalog/', destination: '/catalog/missing' },
    ]);
  });

  it('validates sidebar hrefs that are only rendered by client-side navigation', async () => {
    await write('index.html', 'Home');
    await write('guide/index.html', '<h1 id="heading">Guide</h1>');
    await write(
      'api/sidebar-data.json',
      JSON.stringify({
        nodes: {
          root: { pages: [{ href: '/catalog/guide/#heading' }, { href: '/catalog/missing' }] },
          duplicate: { href: '/catalog/missing' },
          relative: { href: 'guide/#missing' },
          description: '<a href="/not-navigation">',
        },
      })
    );
    expect((await validateBuiltLinks({ outDir, base: '/catalog' })).diagnostics).toEqual([
      { kind: 'anchor', source: '/catalog/api/sidebar-data.json', destination: '/catalog/guide/#missing' },
      { kind: 'link', source: '/catalog/api/sidebar-data.json', destination: '/catalog/missing' },
    ]);
  });

  it('can disable links and anchors independently without treating missing pages as missing anchors', async () => {
    await write('index.html', '<a href="/absent#heading">Absent</a><a href="#heading">Anchor</a>');
    expect((await validateBuiltLinks({ outDir, onBrokenLinks: 'ignore' })).diagnostics).toEqual([
      { kind: 'anchor', source: '/', destination: '/#heading' },
    ]);
    expect((await validateBuiltLinks({ outDir, onBrokenAnchors: 'ignore' })).diagnostics).toEqual([
      { kind: 'link', source: '/', destination: '/absent#heading' },
    ]);
    expect(await validateBuiltLinks({ outDir: '/does-not-exist', onBrokenLinks: 'ignore', onBrokenAnchors: 'ignore' })).toEqual({
      pages: 0,
      diagnostics: [],
    });
  });

  it.each(['file', 'preserve'] as const)('supports %s output and encoded filenames', async (format) => {
    await write('index.html', '<a href="/hello%20world">File</a><a href="/hello%20world.html#ok">File anchor</a>');
    await write('hello world.html', '<h1 id="ok">Hello</h1><a href="/">Home</a>');
    expect((await validateBuiltLinks({ outDir, format })).diagnostics).toEqual([]);
  });

  it('does not check PDF or SVG fragment identifiers as HTML anchors', async () => {
    await write('index.html', '<a href="/document.pdf#page=2">PDF</a><a href="/image.svg#icon">SVG</a>');
    await write('document.pdf', 'test document');
    await write('image.svg', '<svg></svg>');
    expect((await validateBuiltLinks({ outDir })).diagnostics).toEqual([]);
  });

  it('resolves relative links from the canonical URL when trailing slashes are disabled', async () => {
    await write('guide/index.html', '<a href="next">Next</a>');
    await write('next/index.html', 'Next');
    expect((await validateBuiltLinks({ outDir, trailingSlash: 'never' })).diagnostics).toEqual([]);
  });

  it('normalizes Unicode base paths and keeps malformed fragment escapes separate from missing links', async () => {
    await write('index.html', '<a href="/caf%C3%A9/#bad%ZZ">Fragment</a>');
    expect((await validateBuiltLinks({ outDir, base: '/café', onBrokenAnchors: 'ignore' })).diagnostics).toEqual([]);
    expect((await validateBuiltLinks({ outDir, base: '/café', onBrokenLinks: 'ignore' })).diagnostics).toEqual([
      { kind: 'anchor', source: '/caf%C3%A9/', destination: '/caf%C3%A9/#bad%ZZ' },
    ]);
  });

  it('reports malformed internal URLs and missing encoded paths without crashing', async () => {
    await write('index.html', '<a href="/bad%ZZ">Bad encoding</a><a href="/missing%20page">Missing</a>');
    expect((await validateBuiltLinks({ outDir })).diagnostics).toEqual([
      { kind: 'link', source: '/', destination: '/bad%ZZ' },
      { kind: 'link', source: '/', destination: '/missing%20page' },
    ]);
  });

  it('produces deterministic, grouped diagnostics rather than repeating every broken link in the build log', () => {
    expect(
      formatBrokenLinks([
        { kind: 'link', source: '/one/', destination: '/missing', suggestion: '/found' },
        { kind: 'link', source: '/two/', destination: '/missing', suggestion: '/found' },
      ])
    ).toBe(
      'Found 1 broken link/anchor destination(s) in 2 page reference(s).\n\nBroken link: /missing\n  From: /one/\n  From: /two/\n  Possible destination: /found'
    );
  });

  it('reports every broken destination even when there are more than thirty', () => {
    const diagnostics = Array.from({ length: 40 }, (_, i) => ({
      kind: 'link' as const,
      source: '/',
      destination: `/missing-${i}`,
    }));
    const output = formatBrokenLinks(diagnostics);
    expect(output).toContain('Found 40 broken link/anchor destination(s) in 40 page reference(s).');
    expect(output).toContain('Broken link: /missing-39\n  From: /');
  });
});
