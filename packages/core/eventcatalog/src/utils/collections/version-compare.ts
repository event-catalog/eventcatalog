import { coerce, compare, satisfies, valid, validRange } from 'semver';

// Keep in sync with packages/sdk/src/internal/versions.ts
const NUMERIC_VERSION_PATTERN = /^[vV]?\d+(?:\.\d+){0,2}$/;

export function toComparableVersion(version: string | undefined) {
  if (!version) return undefined;

  const strictVersion = valid(version);
  if (strictVersion) return strictVersion;

  if (!NUMERIC_VERSION_PATTERN.test(version)) return undefined;

  return coerce(version) ?? undefined;
}

export function compareVersions(v1: string | undefined, v2: string | undefined): number | undefined {
  const semverV1 = toComparableVersion(v1);
  const semverV2 = toComparableVersion(v2);

  if (!semverV1 || !semverV2) return undefined;

  return compare(semverV1, semverV2);
}

export function versionSatisfiesRange(version: string, range: string) {
  const comparableVersion = toComparableVersion(version);
  const comparableRange = validRange(range) ?? validRange(range.replace(/V(?=\d)/g, 'v'));

  if (!comparableVersion || !comparableRange) return false;

  return satisfies(comparableVersion, comparableRange);
}

export function isSameVersion(v1: string | undefined, v2: string | undefined) {
  const comparison = compareVersions(v1, v2);

  if (comparison !== undefined) return comparison === 0;

  return v1 === v2;
}
