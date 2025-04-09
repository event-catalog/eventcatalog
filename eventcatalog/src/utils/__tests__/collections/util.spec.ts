import type { CollectionTypes } from '@types';
import { getDeprecatedDetails, isSameVersion, satisfies, sortStringVersions } from '@utils/collections/util';
import type { CollectionEntry } from 'astro:content';
import { describe, it, expect } from 'vitest';

describe('Collections - utils', () => {
  describe('satisfies', () => {
    it.each([
      [{ version: '1.0.0', range: '1.0.0', expected: true }],
      [{ version: '1.0.0', range: '^1', expected: true }],
      [{ version: '1.0.0', range: '1', expected: true }],
      [{ version: '1.0.0', range: 'v1', expected: true }],
      [{ version: '1.0.0', range: '>1', expected: false }],
      [{ version: '1', range: '1', expected: true }],
      [{ version: '1', range: '^1', expected: true }],
      [{ version: '1', range: '1.0.0', expected: true }],
      [{ version: '1', range: 'v1', expected: true }],
      [{ version: '1', range: '<1', expected: false }],
      [{ version: '2', range: 'v1', expected: false }],
      [{ version: 'v1', range: 'v1', expected: true }],
      [{ version: 'v1', range: '1', expected: true }],
      [{ version: 'v1', range: '1.0.0', expected: true }],
      [{ version: 'v1', range: '^1', expected: true }],
      [{ version: 'v1', range: '2', expected: false }],
      [{ version: 'v1', range: '>1', expected: false }],
    ])('should returns $expected to version as $version and range as $range', ({ expected, version, range }) => {
      expect(satisfies(version, range)).toBe(expected);
    });
  });

  describe('sortStringVersions', () => {
    it.each([
      [{ versions: ['1', '3', '2'], result: ['3', '2', '1'], latest: '3' }],
      [{ versions: ['10', '1', '2', '3'], result: ['10', '3', '2', '1'], latest: '10' }],
      [{ versions: ['1.0.1', '1.1.0', '1.0.2'], result: ['1.1.0', '1.0.2', '1.0.1'], latest: '1.1.0' }],
      [{ versions: ['a', 'c', 'b'], result: ['c', 'b', 'a'], latest: 'c' }],
      [{ versions: [], result: [], latest: undefined }],
    ])('should returns $latest as latest version of $versions', ({ versions, result, latest }) => {
      expect(sortStringVersions(versions)).toEqual({ versions: result, latestVersion: latest });
    });
  });

  describe('isSameVersion', () => {
    it.each([
      [{ versions: ['1', '2'], result: false }],
      [{ versions: ['1', '1'], result: true }],
      [{ versions: ['2.0.0', '1.1.0'], result: false }],
      [{ versions: ['2.0.0', '2.0.0'], result: true }],
      [{ versions: ['a', 'b'], result: false }],
      [{ versions: ['a', 'a'], result: true }],
      [{ versions: ['1.0.0', undefined], result: false }],
    ])('should returns $result when versions is $versions', ({ versions, result }) => {
      expect(isSameVersion(versions[0], versions[1])).toBe(result);
    });
  });

  describe('getDeprecatedDetails', () => {
    it('returns false when deprecated is false', () => {
      const result = getDeprecatedDetails({ data: { deprecated: false } } as unknown as CollectionEntry<CollectionTypes>);
      expect(result).toEqual({ hasDeprecated: false, isMarkedAsDeprecated: false, message: '', deprecatedDate: '' });
    });

    it('returns true when deprecated is true (boolean)', () => {
      const result = getDeprecatedDetails({ data: { deprecated: true } } as unknown as CollectionEntry<CollectionTypes>);
      expect(result).toEqual({ hasDeprecated: true, isMarkedAsDeprecated: true, message: '', deprecatedDate: '' });
    });

    it('returns true when deprecated is true (object)', () => {
      const result = getDeprecatedDetails({
        data: { deprecated: { date: '2021-01-01', message: 'This is a test message' } },
      } as unknown as CollectionEntry<CollectionTypes>);
      expect(result).toEqual({
        hasDeprecated: true,
        isMarkedAsDeprecated: true,
        message: 'This is a test message',
        deprecatedDate: 'January 1, 2021',
      });
    });
  });
});
