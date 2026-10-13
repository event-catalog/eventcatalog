import { beforeEach, describe, expect, it, vi } from 'vitest';

const config: { title?: string } = {};
vi.mock('@config', () => ({ default: config }));

const { formatPageTitle, getCatalogTitle } = await import('@utils/page-title');

describe('page titles', () => {
  beforeEach(() => {
    config.title = 'Acme Inc';
  });

  it("follows the page's own title with the catalog's title", () => {
    expect(formatPageTitle('Domains | Ordering')).toBe('Domains | Ordering | Acme Inc');
    expect(formatPageTitle('Schema Explorer')).toBe('Schema Explorer | Acme Inc');
  });

  it("is just the catalog's title for a page without its own (the homepage)", () => {
    expect(formatPageTitle()).toBe('Acme Inc');
    expect(formatPageTitle('  ')).toBe('Acme Inc');
    expect(formatPageTitle('Acme Inc')).toBe('Acme Inc');
  });

  it('uses EventCatalog when the catalog has no title', () => {
    config.title = undefined;
    expect(getCatalogTitle()).toBe('EventCatalog');
    expect(formatPageTitle('Domains | Ordering')).toBe('Domains | Ordering | EventCatalog');
    expect(formatPageTitle()).toBe('EventCatalog');

    config.title = '   ';
    expect(formatPageTitle('License | Settings')).toBe('License | Settings | EventCatalog');
  });
});
