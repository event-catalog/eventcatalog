import { describe, it, expect } from 'vitest';
import { getLatestVersionSuggestion, getResourceFromMissingPath } from '../not-found';

describe('404 page helpers', () => {
  describe('getResourceFromMissingPath', () => {
    it('finds the resource type and id in a missing docs page for a version', () => {
      expect(getResourceFromMissingPath('/docs/services/OrderService/9.9.9')).toEqual({ type: 'services', id: 'OrderService' });
    });

    it('finds the resource in missing visualiser and architecture pages', () => {
      expect(getResourceFromMissingPath('/visualiser/events/OrderPlaced/1.0.0')).toEqual({ type: 'events', id: 'OrderPlaced' });
      expect(getResourceFromMissingPath('/architecture/domains/Orders')).toEqual({ type: 'domains', id: 'Orders' });
    });

    it('decodes an id with encoded characters', () => {
      expect(getResourceFromMissingPath('/docs/services/Order%20Service/1.0.0')).toEqual({
        type: 'services',
        id: 'Order Service',
      });
    });

    it('ignores the catalog base path before the resource page', () => {
      expect(getResourceFromMissingPath('/catalog/docs/services/OrderService/9.9.9', '/catalog/')).toEqual({
        type: 'services',
        id: 'OrderService',
      });
    });

    it('does not strip a base path that only matches the start of a path segment', () => {
      expect(getResourceFromMissingPath('/catalogue/docs/services/OrderService', '/catalog')).toBeUndefined();
    });

    it('returns nothing for paths that are not resource pages', () => {
      expect(getResourceFromMissingPath('/this-does-not-exist')).toBeUndefined();
      expect(getResourceFromMissingPath('/docs/services')).toBeUndefined();
      expect(getResourceFromMissingPath('/discover/services/OrderService')).toBeUndefined();
    });

    it('returns nothing for custom documentation and llm pages under /docs', () => {
      expect(getResourceFromMissingPath('/docs/custom/guides/getting-started')).toBeUndefined();
      expect(getResourceFromMissingPath('/docs/llm/llms.txt')).toBeUndefined();
    });

    it('returns nothing when the id is not valid percent-encoding', () => {
      expect(getResourceFromMissingPath('/docs/services/Order%E0%A4%A/1.0.0')).toBeUndefined();
    });
  });

  describe('getLatestVersionSuggestion', () => {
    it('suggests the resource page that redirects to the latest version for a missing version', () => {
      expect(getLatestVersionSuggestion('/docs/services/OrderService/9.9.9')).toEqual({
        id: 'OrderService',
        path: '/docs/services/OrderService',
      });
    });

    it('suggests the resource page for a missing sub page of a resource', () => {
      expect(getLatestVersionSuggestion('/docs/services/OrderService/9.9.9/changelog')).toEqual({
        id: 'OrderService',
        path: '/docs/services/OrderService',
      });
    });

    it('suggests a path without the base so it can be built with buildUrl', () => {
      expect(getLatestVersionSuggestion('/catalog/visualiser/services/OrderService/2.0.0', '/catalog')).toEqual({
        id: 'OrderService',
        path: '/docs/services/OrderService',
      });
    });

    it('keeps encoded characters in the suggested path', () => {
      expect(getLatestVersionSuggestion('/docs/services/Order%20Service/1.0.0')?.path).toBe('/docs/services/Order%20Service');
    });

    it('suggests nothing when the missing page is the resource page itself, as the resource is not in the catalog', () => {
      expect(getLatestVersionSuggestion('/docs/services/NotARealService')).toBeUndefined();
      expect(getLatestVersionSuggestion('/docs/services/NotARealService/')).toBeUndefined();
      expect(getLatestVersionSuggestion('/catalog/docs/services/NotARealService', '/catalog/')).toBeUndefined();
    });

    it('suggests nothing for paths that are not resource pages', () => {
      expect(getLatestVersionSuggestion('/this-does-not-exist')).toBeUndefined();
    });
  });
});
