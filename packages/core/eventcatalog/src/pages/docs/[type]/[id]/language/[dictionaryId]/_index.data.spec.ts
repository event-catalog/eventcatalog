import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUbiquitousLanguageTermPage, Page, resolveUbiquitousLanguageTermEditUrl } from './_index.data';

const mocks = vi.hoisted(() => ({
  isSSR: vi.fn(() => false),
  getDomains: vi.fn(),
  getUbiquitousLanguage: vi.fn(),
}));

vi.mock('@utils/feature', () => ({
  isSSR: () => mocks.isSSR(),
}));

vi.mock('@utils/collections/domains', () => ({
  getDomains: mocks.getDomains,
  getUbiquitousLanguage: mocks.getUbiquitousLanguage,
}));

const domain = {
  collection: 'domains',
  filePath: 'domains/Orders/index.mdx',
  data: {
    id: 'Orders',
    name: 'Orders',
    version: '0.0.1',
  },
} as any;

const term: { id: string; name: string; summary?: string; editUrl?: string } = {
  id: 'Order',
  name: 'Order',
  summary: 'A confirmed intent to purchase',
};

const collection = {
  collection: 'ubiquitousLanguages',
  filePath: 'domains/Orders/ubiquitous-language.mdx',
  data: {
    dictionary: [term],
  },
} as any;

const configEditUrl = 'https://github.com/event-catalog/eventcatalog/edit/main';

describe('ubiquitous language term page data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSSR.mockReturnValue(false);
    mocks.getDomains.mockResolvedValue([domain]);
    mocks.getUbiquitousLanguage.mockResolvedValue([collection]);
  });

  describe('resolveUbiquitousLanguageTermEditUrl', () => {
    it('uses a per-term editUrl when it is set', () => {
      expect(
        resolveUbiquitousLanguageTermEditUrl({
          term: { ...term, editUrl: 'https://github.com/org/glossary/edit/main/Order.md' },
          collection: { ...collection, data: { ...collection.data, editUrl: 'https://example.com/ignored' } },
          configEditUrl,
        })
      ).toBe('https://github.com/org/glossary/edit/main/Order.md');
    });

    it('uses a collection-level editUrl when the term does not set one', () => {
      expect(
        resolveUbiquitousLanguageTermEditUrl({
          term,
          collection: { ...collection, data: { ...collection.data, editUrl: 'https://github.com/org/catalog/edit/main/ul.mdx' } },
          configEditUrl,
        })
      ).toBe('https://github.com/org/catalog/edit/main/ul.mdx');
    });

    it('falls back to the site-wide config.editUrl and the dictionary file path', () => {
      expect(resolveUbiquitousLanguageTermEditUrl({ term, collection, configEditUrl })).toBe(
        'https://github.com/event-catalog/eventcatalog/edit/main/domains/Orders/ubiquitous-language.mdx'
      );
    });

    it('returns an empty string when no editUrl is available', () => {
      expect(resolveUbiquitousLanguageTermEditUrl({ term, collection })).toBe('');
    });
  });

  describe('buildUbiquitousLanguageTermPage', () => {
    it('exposes the dictionary file path and collection editUrl for the Edit this page link', () => {
      const page = buildUbiquitousLanguageTermPage({
        domain,
        collection: {
          ...collection,
          data: {
            editUrl: 'https://github.com/org/catalog/edit/main/ul.mdx',
            dictionary: [term],
          },
        },
        term: { ...term, editUrl: 'https://github.com/org/glossary/edit/main/Order.md' },
      });

      expect(page.params).toEqual({
        type: 'domains',
        id: 'Orders',
        dictionaryId: 'Order',
      });
      expect(page.props.filePath).toBe('domains/Orders/ubiquitous-language.mdx');
      expect(page.props.collectionEditUrl).toBe('https://github.com/org/catalog/edit/main/ul.mdx');
      expect(page.props.ubiquitousLanguage.editUrl).toBe('https://github.com/org/glossary/edit/main/Order.md');
      expect(
        resolveUbiquitousLanguageTermEditUrl({
          term: page.props.ubiquitousLanguage,
          collection: { filePath: page.props.filePath, data: { editUrl: page.props.collectionEditUrl } },
          configEditUrl,
        })
      ).toBe('https://github.com/org/glossary/edit/main/Order.md');
    });
  });

  describe('Page.getStaticPaths', () => {
    it('includes the dictionary file path used for the config.editUrl fallback href', async () => {
      const paths = await Page.getStaticPaths();

      expect(paths).toHaveLength(1);
      expect(paths[0].params.dictionaryId).toBe('Order');
      expect(paths[0].props.filePath).toBe('domains/Orders/ubiquitous-language.mdx');
      expect(
        resolveUbiquitousLanguageTermEditUrl({
          term: paths[0].props.ubiquitousLanguage,
          collection: { filePath: paths[0].props.filePath, data: { editUrl: paths[0].props.collectionEditUrl } },
          configEditUrl,
        })
      ).toBe('https://github.com/event-catalog/eventcatalog/edit/main/domains/Orders/ubiquitous-language.mdx');
    });
  });

  describe('Page.getData', () => {
    it('resolves the Edit this page href when loading a term in SSR', async () => {
      const props = await Page.getData({
        props: {},
        params: { type: 'domains', id: 'Orders', dictionaryId: 'Order' },
      } as any);

      expect(
        resolveUbiquitousLanguageTermEditUrl({
          term: props.ubiquitousLanguage,
          collection: { filePath: props.filePath, data: { editUrl: props.collectionEditUrl } },
          configEditUrl,
        })
      ).toBe('https://github.com/event-catalog/eventcatalog/edit/main/domains/Orders/ubiquitous-language.mdx');
    });
  });
});
