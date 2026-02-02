import { describe, it, expect } from 'vitest';
import { versionMatches } from '../../../node-graphs/utils/utils';

describe('versionMatches', () => {
  describe('when configVersion is undefined or "latest"', () => {
    it('returns true when configVersion is undefined (matches any message version)', () => {
      expect(versionMatches(undefined, '1.0.0')).toBe(true);
      expect(versionMatches(undefined, '2.0.0')).toBe(true);
      expect(versionMatches(undefined, 'latest')).toBe(true);
      expect(versionMatches(undefined, undefined)).toBe(true);
    });

    it('returns true when configVersion is "latest" (matches any message version)', () => {
      expect(versionMatches('latest', '1.0.0')).toBe(true);
      expect(versionMatches('latest', '2.0.0')).toBe(true);
      expect(versionMatches('latest', 'latest')).toBe(true);
      expect(versionMatches('latest', undefined)).toBe(true);
    });
  });

  describe('when messageVersion is undefined or "latest"', () => {
    it('returns false when configVersion is specific but messageVersion is undefined', () => {
      expect(versionMatches('1.0.0', undefined)).toBe(false);
      expect(versionMatches('2.0.0', undefined)).toBe(false);
    });

    it('returns false when configVersion is specific but messageVersion is "latest"', () => {
      expect(versionMatches('1.0.0', 'latest')).toBe(false);
      expect(versionMatches('2.0.0', 'latest')).toBe(false);
    });
  });

  describe('when both versions are specific', () => {
    it('returns true when versions match exactly', () => {
      expect(versionMatches('1.0.0', '1.0.0')).toBe(true);
      expect(versionMatches('2.0.0', '2.0.0')).toBe(true);
      expect(versionMatches('0.0.1', '0.0.1')).toBe(true);
      expect(versionMatches('1.0.1', '1.0.1')).toBe(true);
    });

    it('returns false when versions do not match', () => {
      expect(versionMatches('1.0.0', '2.0.0')).toBe(false);
      expect(versionMatches('0.0.1', '1.0.1')).toBe(false);
      expect(versionMatches('1.0.0', '1.0.1')).toBe(false);
      expect(versionMatches('1.0.0', '0.0.1')).toBe(false);
    });
  });

  describe('should_handle_undefined_accepted_version', () => {
    it('matches any actualMessageVersion when acceptedVersion is undefined', () => {
      expect(versionMatches(undefined, '1.0.0')).toBe(true);
      expect(versionMatches(undefined, '2.5.3')).toBe(true);
      expect(versionMatches(undefined, '0.0.1')).toBe(true);
    });
  });

  describe('should_handle_latest_accepted_version', () => {
    it('matches any actualMessageVersion when acceptedVersion is latest', () => {
      expect(versionMatches('latest', '1.0.0')).toBe(true);
      expect(versionMatches('latest', '2.5.3')).toBe(true);
      expect(versionMatches('latest', '0.0.1')).toBe(true);
    });
  });

  describe('should_handle_undefined_actual_version', () => {
    it('only matches undefined or latest acceptedVersion when actualMessageVersion is undefined', () => {
      expect(versionMatches(undefined, undefined)).toBe(true);
      expect(versionMatches('latest', undefined)).toBe(true);
      expect(versionMatches('1.0.0', undefined)).toBe(false);
      expect(versionMatches('^1.0.0', undefined)).toBe(false);
    });
  });

  describe('should_delegate_to_generic_utility_for_exact_match', () => {
    it('matches exact versions through delegation', () => {
      expect(versionMatches('1.0.0', '1.0.0')).toBe(true);
      expect(versionMatches('2.5.3', '2.5.3')).toBe(true);
    });
  });

  describe('should_delegate_to_generic_utility_for_semver_patterns', () => {
    it('matches semver ranges through delegation', () => {
      expect(versionMatches('^1.0.0', '1.2.3')).toBe(true);
      expect(versionMatches('~1.2.0', '1.2.5')).toBe(true);
      expect(versionMatches('>=1.0.0 <2.0.0', '1.5.0')).toBe(true);
    });

    it('does not match when version does not satisfy range', () => {
      expect(versionMatches('^2.0.0', '1.0.0')).toBe(false);
      expect(versionMatches('~1.2.0', '1.3.0')).toBe(false);
    });
  });

  describe('should_delegate_to_generic_utility_for_x_patterns', () => {
    it('matches x-patterns through delegation', () => {
      expect(versionMatches('1.x', '1.2.3')).toBe(true);
      expect(versionMatches('1.2.x', '1.2.5')).toBe(true);
      expect(versionMatches('2.x', '2.0.0')).toBe(true);
    });

    it('does not match when x-pattern differs', () => {
      expect(versionMatches('2.x', '1.0.0')).toBe(false);
      expect(versionMatches('1.2.x', '1.3.0')).toBe(false);
    });
  });
});
