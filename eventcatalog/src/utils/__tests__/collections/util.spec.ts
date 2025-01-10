import { findLatestVersion, satisfies } from '@utils/collections/util';
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

  describe('findLatestVersion', () => {
    it.each([
      [{ versions: ['1', '3', '2'], latest: '3' }],
      [{ versions: ['1.0.1', '1.1.0', '1.0.2'], latest: '1.1.0' }],
      [{ versions: ['a', 'c', 'b'], latest: 'c' }],
    ])('should returns $latest as latest version of $versions', ({ versions, latest }) => {
      expect(findLatestVersion(versions)).toBe(latest);
    });
  });
});
