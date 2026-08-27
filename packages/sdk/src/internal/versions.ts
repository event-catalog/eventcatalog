import { coerce, compare, satisfies, valid, validRange } from 'semver';

// Keep in sync with packages/core/eventcatalog/src/utils/collections/version-compare.ts
const NUMERIC_VERSION_PATTERN = /^[vV]?\d+(?:\.\d+){0,2}$/;

export const toComparableVersion = (version: string) => {
  const strictVersion = valid(version);
  if (strictVersion) return strictVersion;

  if (!NUMERIC_VERSION_PATTERN.test(version)) return undefined;

  return coerce(version) ?? undefined;
};

/**
 * Compares version strings that can be interpreted as semver, including
 * number-like versions such as `1`, `v1`, and `V1`.
 *
 * Returns undefined when either value cannot be compared numerically.
 */
export const compareVersions = (left: string, right: string): number | undefined => {
  const leftVersion = toComparableVersion(left);
  const rightVersion = toComparableVersion(right);

  if (!leftVersion || !rightVersion) return undefined;

  return compare(leftVersion, rightVersion);
};

export const isVersionGreaterThan = (candidate: string, current: string) => compareVersions(candidate, current) === 1;

export const versionSatisfiesRange = (version: string, range: string) => {
  const comparableVersion = toComparableVersion(version);
  const comparableRange = validRange(range) ?? validRange(range.replace(/V(?=\d)/g, 'v'));

  if (!comparableVersion || !comparableRange) return false;

  return satisfies(comparableVersion, comparableRange);
};
