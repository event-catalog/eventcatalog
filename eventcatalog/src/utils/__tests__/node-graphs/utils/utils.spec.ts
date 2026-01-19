import { describe, it, expect } from 'vitest';
import { versionMatches } from '../../node-graphs/utils/utils';

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
});
