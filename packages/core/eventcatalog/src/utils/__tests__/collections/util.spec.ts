import type { CollectionTypes } from '@types';
import {
  getDeprecatedDetails,
  isSameVersion,
  processSpecifications,
  satisfies,
  sortStringVersions,
  versionMatches,
} from '@utils/collections/util';
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

  describe('processSpecifications', () => {
    it('preserves headers in array specification format', () => {
      const result = processSpecifications([
        {
          type: 'asyncapi',
          path: 'https://example.com/asyncapi.yaml',
          headers: {
            Authorization: 'Bearer ${TOKEN}',
          },
        },
      ]);

      expect(result).toEqual([
        {
          type: 'asyncapi',
          path: 'https://example.com/asyncapi.yaml',
          name: 'AsyncAPI',
          filename: 'asyncapi.yaml',
          filenameWithoutExtension: 'asyncapi',
          headers: {
            Authorization: 'Bearer ${TOKEN}',
          },
        },
      ]);
    });
  });

  describe('versionMatches', () => {
    describe('should_match_exact_versions', () => {
      it('matches when version equals rangePattern exactly', () => {
        expect(versionMatches('1.0.0', '1.0.0')).toBe(true);
        expect(versionMatches('2.5.3', '2.5.3')).toBe(true);
        expect(versionMatches('0.0.1', '0.0.1')).toBe(true);
      });
    });

    describe('should_match_when_range_has_caret_and_version_satisfies', () => {
      it('matches version 1.2.3 with rangePattern ^1.0.0', () => {
        expect(versionMatches('1.2.3', '^1.0.0')).toBe(true);
      });

      it('matches version 1.0.0 with rangePattern ^1.0.0', () => {
        expect(versionMatches('1.0.0', '^1.0.0')).toBe(true);
      });

      it('matches version 1.9.9 with rangePattern ^1.0.0', () => {
        expect(versionMatches('1.9.9', '^1.0.0')).toBe(true);
      });
    });

    describe('should_match_when_range_has_tilde_and_version_satisfies', () => {
      it('matches version 1.2.5 with rangePattern ~1.2.0', () => {
        expect(versionMatches('1.2.5', '~1.2.0')).toBe(true);
      });

      it('matches version 1.2.0 with rangePattern ~1.2.0', () => {
        expect(versionMatches('1.2.0', '~1.2.0')).toBe(true);
      });

      it('does not match version 1.3.0 with rangePattern ~1.2.0', () => {
        expect(versionMatches('1.3.0', '~1.2.0')).toBe(false);
      });
    });

    describe('should_not_match_when_version_does_not_satisfy_range', () => {
      it('does not match version 1.0.0 with rangePattern ^2.0.0', () => {
        expect(versionMatches('1.0.0', '^2.0.0')).toBe(false);
      });

      it('does not match version 3.0.0 with rangePattern ^2.0.0', () => {
        expect(versionMatches('3.0.0', '^2.0.0')).toBe(false);
      });

      it('does not match version 0.9.9 with rangePattern ^1.0.0', () => {
        expect(versionMatches('0.9.9', '^1.0.0')).toBe(false);
      });
    });

    describe('should_handle_complex_semver_ranges', () => {
      it('matches version 1.5.0 with rangePattern >=1.0.0 <2.0.0', () => {
        expect(versionMatches('1.5.0', '>=1.0.0 <2.0.0')).toBe(true);
      });

      it('matches version 1.0.0 with rangePattern >=1.0.0 <2.0.0', () => {
        expect(versionMatches('1.0.0', '>=1.0.0 <2.0.0')).toBe(true);
      });

      it('does not match version 2.0.0 with rangePattern >=1.0.0 <2.0.0', () => {
        expect(versionMatches('2.0.0', '>=1.0.0 <2.0.0')).toBe(false);
      });

      it('does not match version 0.9.9 with rangePattern >=1.0.0 <2.0.0', () => {
        expect(versionMatches('0.9.9', '>=1.0.0 <2.0.0')).toBe(false);
      });
    });

    describe('should_return_false_when_version_is_invalid_semver', () => {
      it('returns false for invalid version with valid rangePattern', () => {
        expect(versionMatches('not-a-version', '^1.0.0')).toBe(false);
      });

      it('returns false for invalid version with exact rangePattern', () => {
        expect(versionMatches('invalid', '1.0.0')).toBe(false);
      });
    });

    describe('should_handle_latest_keyword', () => {
      it('matches any version when rangePattern is latest', () => {
        expect(versionMatches('1.0.0', 'latest')).toBe(true);
        expect(versionMatches('2.5.3', 'latest')).toBe(true);
        expect(versionMatches('0.0.1', 'latest')).toBe(true);
        expect(versionMatches('99.99.99', 'latest')).toBe(true);
      });
    });

    describe('should_match_when_range_has_single_x_pattern', () => {
      it('matches versions with major version 1 against rangePattern 1.x', () => {
        expect(versionMatches('1.0.0', '1.x')).toBe(true);
        expect(versionMatches('1.2.3', '1.x')).toBe(true);
        expect(versionMatches('1.99.99', '1.x')).toBe(true);
      });

      it('does not match versions with different major version', () => {
        expect(versionMatches('2.0.0', '1.x')).toBe(false);
        expect(versionMatches('0.9.9', '1.x')).toBe(false);
      });
    });

    describe('should_match_when_range_has_double_x_pattern', () => {
      it('matches versions with major.minor 1.2 against rangePattern 1.2.x', () => {
        expect(versionMatches('1.2.0', '1.2.x')).toBe(true);
        expect(versionMatches('1.2.5', '1.2.x')).toBe(true);
        expect(versionMatches('1.2.99', '1.2.x')).toBe(true);
      });

      it('does not match versions with different major.minor', () => {
        expect(versionMatches('1.3.0', '1.2.x')).toBe(false);
        expect(versionMatches('2.2.0', '1.2.x')).toBe(false);
      });
    });

    describe('should_not_match_when_x_pattern_differs', () => {
      it('does not match when major version differs', () => {
        expect(versionMatches('1.0.0', '2.x')).toBe(false);
        expect(versionMatches('3.0.0', '2.x')).toBe(false);
      });
    });

    describe('should_not_match_when_prefix_matches_but_boundary_incorrect', () => {
      it('does not match 1.20.0 with rangePattern 1.2.x', () => {
        expect(versionMatches('1.20.0', '1.2.x')).toBe(false);
      });

      it('does not match 10.0.0 with rangePattern 1.x', () => {
        expect(versionMatches('10.0.0', '1.x')).toBe(false);
      });
    });

    describe('should_handle_x_at_major_version', () => {
      it('matches version 2.0.0 with rangePattern 2.x', () => {
        expect(versionMatches('2.0.0', '2.x')).toBe(true);
        expect(versionMatches('2.1.0', '2.x')).toBe(true);
        expect(versionMatches('2.99.99', '2.x')).toBe(true);
      });
    });
  });
});
