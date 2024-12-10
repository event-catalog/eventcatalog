import { satisfies } from '@utils/collections/util';
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
});
