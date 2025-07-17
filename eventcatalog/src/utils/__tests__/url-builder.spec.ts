import { buildEditUrlForResource, buildUrl, buildUrlWithParams } from '../url-builder';

declare global {
  interface Window {
    __EC_TRAILING_SLASH__: boolean;
  }
  namespace NodeJS {
    interface ImportMeta {
      env: {
        BASE_URL: string;
      };
    }
  }
}

describe('url-builder', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the environment before each test
    // @ts-ignore
    global.__EC_TRAILING_SLASH__ = false;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('buildUrl', () => {
    it('should build a basic url', () => {
      const url = buildUrl('example.com');
      expect(url).toBe('example.com');
    });

    it('should clean urls with multiple slashes', () => {
      const url = buildUrl('docs/path/to/resource//with/double/slashes');
      expect(url).toBe('docs/path/to/resource/with/double/slashes');
    });

    it('should handle trailing slash when enabled', () => {
      // @ts-ignore
      global.__EC_TRAILING_SLASH__ = true;
      const url = buildUrl('path/to/resource');
      expect(url).toBe('path/to/resource/');
    });

    it('should not add trailing slash when disabled', () => {
      // @ts-ignore
      global.__EC_TRAILING_SLASH__ = false;
      const url = buildUrl('path/to/resource');
      expect(url).toBe('path/to/resource');
    });

    it('should not add trailing slash when ignoreTrailingSlash is true', () => {
      // @ts-ignore
      global.__EC_TRAILING_SLASH__ = true;
      const url = buildUrl('path/to/resource', true);
      expect(url).toBe('path/to/resource');
    });

    it('should handle base URL when not root', () => {
      // @ts-ignore
      import.meta.env.BASE_URL = '/docs/';
      const url = buildUrl('/path/to/resource');
      expect(url).toBe('/docs/path/to/resource');
    });
  });

  describe('buildUrlWithParams', () => {
    it('should build url without params when no valid params provided', () => {
      const url = buildUrlWithParams('example.com', {});
      expect(url).toBe('example.com');
    });

    it('should build url with single query parameter', () => {
      const url = buildUrlWithParams('example.com', { key: 'value' });
      expect(url).toBe('example.com?key=value');
    });

    it('should handle trailing slash when enabled', () => {
      // @ts-ignore
      global.__EC_TRAILING_SLASH__ = true;
      const url = buildUrlWithParams('example.com', { key: 'value' });
      expect(url).toBe('example.com/?key=value');
    });

    it('should build url with multiple query parameters', () => {
      const url = buildUrlWithParams('example.com', {
        key1: 'value1',
        key2: 'value2',
      });
      expect(url).toBe('example.com?key1=value1&key2=value2');
    });

    it('should filter out undefined and empty string values', () => {
      const url = buildUrlWithParams('example.com', {
        key1: 'value1',
        key2: undefined,
        key3: '',
        key4: 'value4',
      });
      expect(url).toBe('example.com?key1=value1&key4=value4');
    });
  });

  describe('buildEditUrlForResource', () => {
    it('should build a basic url', () => {
      const url = buildEditUrlForResource(
        'https://github.com/eventcatalog/eventcatalog/edit/main',
        'examples/default/domains/E-Commerce/index.mdx'
      );
      expect(url).toBe('https://github.com/eventcatalog/eventcatalog/edit/main/examples/default/domains/E-Commerce/index.mdx');
    });

    it('should remove ../ from the filepath', () => {
      const url = buildEditUrlForResource(
        'https://github.com/eventcatalog/eventcatalog/edit/main',
        '../examples/default/domains/E-Commerce/index.mdx'
      );
      expect(url).toBe('https://github.com/eventcatalog/eventcatalog/edit/main/examples/default/domains/E-Commerce/index.mdx');
    });

    it('should remove ./ from the filepath', () => {
      const url = buildEditUrlForResource(
        'https://github.com/eventcatalog/eventcatalog/edit/main',
        './examples/default/domains/E-Commerce/index.mdx'
      );
      expect(url).toBe('https://github.com/eventcatalog/eventcatalog/edit/main/examples/default/domains/E-Commerce/index.mdx');
    });
  });
});
