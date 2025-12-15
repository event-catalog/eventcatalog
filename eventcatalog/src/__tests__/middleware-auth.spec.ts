import { describe, it, expect } from 'vitest';
import { findMatchingRule, matchesPattern } from '../enterprise/auth/middleware/middleware-auth';

describe('middleware-auth', () => {
  describe('matchesPattern', () => {
    it('should match exact paths', () => {
      expect(matchesPattern('/home', '/home')).toBe(true);
      expect(matchesPattern('/about', '/about')).toBe(true);
      expect(matchesPattern('/home', '/about')).toBe(false);
    });

    it('should match single wildcard patterns', () => {
      expect(matchesPattern('/user/*', '/user/123')).toBe(true);
      expect(matchesPattern('/user/*', '/user/profile')).toBe(true);
      expect(matchesPattern('/user/*', '/user/123/edit')).toBe(false);
      expect(matchesPattern('/api/*/data', '/api/v1/data')).toBe(true);
      expect(matchesPattern('/api/*/data', '/api/v1/user/data')).toBe(false);
    });

    it('should match double wildcard patterns', () => {
      expect(matchesPattern('/admin/**', '/admin/users')).toBe(true);
      expect(matchesPattern('/admin/**', '/admin/users/123')).toBe(true);
      expect(matchesPattern('/admin/**', '/admin/users/123/edit')).toBe(true);
      expect(matchesPattern('/admin/**', '/public/users')).toBe(false);
    });

    it('should handle mixed wildcard patterns', () => {
      expect(matchesPattern('/api/*/users/**', '/api/v1/users/123')).toBe(true);
      expect(matchesPattern('/api/*/users/**', '/api/v1/users/123/profile')).toBe(true);
      expect(matchesPattern('/api/*/users/**', '/api/v1/posts/123')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(matchesPattern('', '')).toBe(true);
      expect(matchesPattern('*', 'anything')).toBe(true);
      expect(matchesPattern('**', 'anything/nested')).toBe(true);
      expect(matchesPattern('/*/test', '/a/test')).toBe(true);
      expect(matchesPattern('/*/test', '/a/b/test')).toBe(false);
    });
  });

  describe('findMatchingRule', () => {
    it('should return null when no rules match', () => {
      const rules = {
        '/admin/*': () => true,
        '/api/*': () => false,
      };

      expect(findMatchingRule(rules, '/home')).toBe(null);
      expect(findMatchingRule(rules, '/public/data')).toBe(null);
    });

    it('should return the matching rule function', () => {
      const adminRule = () => true;
      const apiRule = () => false;
      const rules = {
        '/admin/*': adminRule,
        '/api/*': apiRule,
      };

      expect(findMatchingRule(rules, '/admin/users')).toBe(adminRule);
      expect(findMatchingRule(rules, '/api/data')).toBe(apiRule);
    });

    it('should return the most specific rule when multiple rules match', () => {
      const generalRule = () => true;
      const specificRule = () => false;
      const verySpecificRule = () => true;

      const rules = {
        '/admin/**': generalRule,
        '/admin/users/*': specificRule,
        '/admin/users/profile': verySpecificRule,
      };

      expect(findMatchingRule(rules, '/admin/users/profile')).toBe(verySpecificRule);
      expect(findMatchingRule(rules, '/admin/users/123')).toBe(specificRule);
      expect(findMatchingRule(rules, '/admin/settings')).toBe(generalRule);
    });

    it('should handle specificity correctly based on pattern length and wildcards', () => {
      const shortWildcard = () => true;
      const longExact = () => false;
      const mediumWildcard = () => true;

      const rules = {
        '/*': shortWildcard,
        '/very/long/exact/path': longExact,
        '/medium/*': mediumWildcard,
      };

      expect(findMatchingRule(rules, '/very/long/exact/path')).toBe(longExact);
      expect(findMatchingRule(rules, '/medium/path')).toBe(mediumWildcard);
    });

    it('should handle empty rules object', () => {
      expect(findMatchingRule({}, '/any/path')).toBe(null);
    });

    it('should handle rules with double wildcards', () => {
      const doubleWildcardRule = () => true;
      const singleWildcardRule = () => false;

      const rules = {
        '/api/**': doubleWildcardRule,
        '/api/v1/*': singleWildcardRule,
      };

      expect(findMatchingRule(rules, '/api/v1/users')).toBe(singleWildcardRule);
      expect(findMatchingRule(rules, '/api/v2/users/123')).toBe(doubleWildcardRule);
    });

    it('should prefer more specific patterns over less specific ones', () => {
      const exactMatch = () => true;
      const singleWildcard = () => true;
      const doubleWildcard = () => true;

      const rules = {
        '/users/**': doubleWildcard,
        '/users/*': singleWildcard,
        '/users/profile': exactMatch,
      };

      expect(findMatchingRule(rules, '/users/profile')).toBe(exactMatch);
      expect(findMatchingRule(rules, '/users/123')).toBe(singleWildcard);
      expect(findMatchingRule(rules, '/users/123/settings')).toBe(doubleWildcard);
    });
  });
});
