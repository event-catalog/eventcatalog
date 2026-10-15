import semver from 'semver';

// Mirrors packages/sdk/src/internal/versions.ts (not exported by the SDK), which is kept in sync with core's
// version-compare.ts, so the reference resolves pointers to the same versions the catalog does.
const NUMERIC_VERSION_PATTERN = /^[vV]?\d+(?:\.\d+){0,2}$/;

/** Strict semver, or a number-like version such as `1`, `v1` or `V1`, as something semver can compare. */
const toComparableVersion = (version: string) => {
  const strict = semver.valid(version);
  if (strict) return strict;
  if (!NUMERIC_VERSION_PATTERN.test(version)) return undefined;
  return semver.coerce(version) ?? undefined;
};

const versionSatisfiesRange = (version: string, range: string) => {
  const comparable = toComparableVersion(version);
  const comparableRange = semver.validRange(range) ?? semver.validRange(range.replace(/V(?=\d)/g, 'v'));
  if (!comparable || !comparableRange) return false;
  return semver.satisfies(comparable, comparableRange);
};

/**
 * Whether a pointer's version (`wanted`) refers to the exported version (`current`): no version, 'latest', the
 * exact version, or a range it satisfies. Only latest versions are exported, so anything else is an older version.
 */
export const matchesVersion = (wanted: string | undefined, current: string | undefined) => {
  const range = wanted?.trim();
  if (!range || !current || range === 'latest' || range === current) return true;
  return versionSatisfiesRange(current, range);
};
