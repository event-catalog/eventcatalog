import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDocumentTitle, getCatalogName, resolvePageTitle } from '../catalog-title';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../../');

describe('getCatalogName', () => {
  it('uses title when the catalog sets one', () => {
    expect(getCatalogName({ title: 'Platform Architecture', organizationName: 'Platform Architecture' })).toBe(
      'Platform Architecture'
    );
  });

  it('prefers an explicit title over a different organization name', () => {
    expect(getCatalogName({ title: 'Architecture Portal', organizationName: 'Platform Architecture' })).toBe(
      'Architecture Portal'
    );
  });

  it('skips the EventCatalog placeholder when organizationName is set', () => {
    expect(
      getCatalogName({
        title: 'EventCatalog',
        organizationName: 'Platform Architecture',
        logo: { text: 'EventCatalog' },
      })
    ).toBe('Platform Architecture');
  });

  it('falls back to logo text, then the product name', () => {
    expect(getCatalogName({ logo: { text: 'FlowMart' } })).toBe('FlowMart');
    expect(getCatalogName({ title: '   ', organizationName: '' })).toBe('EventCatalog');
    expect(getCatalogName(null)).toBe('EventCatalog');
  });

  it('keeps EventCatalog when that is the configured name', () => {
    expect(getCatalogName({ title: 'EventCatalog', organizationName: 'EventCatalog' })).toBe('EventCatalog');
  });
});

describe('formatDocumentTitle', () => {
  it('uses only the catalog name on the homepage placeholder', () => {
    expect(formatDocumentTitle('EventCatalog', 'Platform Architecture')).toBe('Platform Architecture');
    expect(resolvePageTitle('EventCatalog', 'Platform Architecture')).toBe('Platform Architecture');
  });

  it('does not repeat the catalog name', () => {
    expect(formatDocumentTitle('Platform Architecture', 'Platform Architecture')).toBe('Platform Architecture');
  });

  it('prefixes other pages with the catalog name', () => {
    expect(formatDocumentTitle('Explore | Domains', 'Platform Architecture')).toBe('Platform Architecture | Explore | Domains');
    expect(formatDocumentTitle('Explore | Domains', 'EventCatalog')).toBe('EventCatalog | Explore | Domains');
  });
});

describe('default homepage copy', () => {
  const homepages = [
    'packages/create-eventcatalog/templates/default/pages/homepage.astro',
    'examples/default/pages/homepage.astro',
  ];

  it.each(homepages)('%s reads the catalog name instead of hard-coding Acme', (relativePath) => {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    expect(source).toContain("import { getCatalogName } from '@utils/catalog-title'");
    expect(source).toContain('const catalogName = getCatalogName(config)');
    expect(source).not.toContain('Acme');
  });
});
