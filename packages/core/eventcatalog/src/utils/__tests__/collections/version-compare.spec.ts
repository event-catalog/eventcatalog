import { isSameVersion } from '@utils/collections/version-compare';
import { describe, it, expect } from 'vitest';

describe('version-compare', () => {
  describe('isSameVersion', () => {
    it.each([
      [{ v1: '1.0.0', v2: '1.0.0', expected: true }],
      [{ v1: '1', v2: '1', expected: true }],
      [{ v1: '1', v2: '1.0.0', expected: true }],
      [{ v1: 'v1', v2: '1.0.0', expected: true }],
      [{ v1: '1.0.0', v2: '2.0.0', expected: false }],
      [{ v1: '2.0.0', v2: '1.1.0', expected: false }],
      [{ v1: '1', v2: '2', expected: false }],
      [{ v1: 'a', v2: 'a', expected: true }],
      [{ v1: 'a', v2: 'b', expected: false }],
      [{ v1: '1.0.0', v2: undefined, expected: false }],
      [{ v1: undefined, v2: '1.0.0', expected: false }],
      [{ v1: undefined, v2: undefined, expected: true }],
    ])('returns $expected for v1=$v1 v2=$v2', ({ v1, v2, expected }) => {
      expect(isSameVersion(v1, v2)).toBe(expected);
    });
  });
});
