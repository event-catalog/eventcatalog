import { describe, expect, it } from 'vitest';
import { compareVersions, versionSatisfiesRange } from '../internal/versions';

describe('version comparison', () => {
  it('compares V-prefixed integer versions numerically', () => {
    expect(compareVersions('V10', 'V2')).toBe(1);
  });

  it('preserves strict semver prerelease ordering', () => {
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1);
    expect(versionSatisfiesRange('1.0.0-beta.1', '^1.0.0')).toBe(false);
  });

  it('matches V-prefixed integer versions against semver ranges', () => {
    expect(versionSatisfiesRange('V1', '^1.0.0')).toBe(true);
  });

  it('matches versions against V-prefixed ranges', () => {
    expect(versionSatisfiesRange('1.2.0', 'V1')).toBe(true);
    expect(versionSatisfiesRange('V2', '>=V2')).toBe(true);
    expect(versionSatisfiesRange('V1', '>=V2')).toBe(false);
  });

  it('does not coerce arbitrary strings or date-like versions', () => {
    expect(compareVersions('release-2', 'release-1')).toBeUndefined();
    expect(compareVersions('2024-11', '2024-10')).toBeUndefined();
  });
});
