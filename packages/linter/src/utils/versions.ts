import semver from 'semver';

/**
 * Version helpers that mirror EventCatalog core
 * (`packages/core/eventcatalog/src/utils/collections/version-compare.ts`) and the SDK
 * (`packages/sdk/src/internal/versions.ts`) so the linter accepts exactly what the catalog accepts.
 *
 * Resource versions may be strict semver (`1.2.3`), number-like (`1`, `1.2`, `v1`, `V2.1`) or, for
 * references, `latest` and any semver range (`^1.0.0`, `~1.2.0`, `1.x`, `>=2`).
 */

// Keep in sync with core / SDK
const NUMERIC_VERSION_PATTERN = /^[vV]?\d+(?:\.\d+){0,2}$/;

export const LATEST = 'latest';

/** Coerces a resource version to strict semver, or undefined when it cannot be compared numerically. */
export const toComparableVersion = (version: string | undefined): string | undefined => {
  if (!version) return undefined;

  const strictVersion = semver.valid(version);
  if (strictVersion) return strictVersion;

  if (!NUMERIC_VERSION_PATTERN.test(version)) return undefined;

  return semver.coerce(version)?.version ?? undefined;
};

/** True when the value is a version EventCatalog can compare (semver or number-like). */
export const isComparableVersion = (version: string | undefined): boolean => toComparableVersion(version) !== undefined;

/** Normalises a range the same way core does (`V1` -> `v1`) and returns it if semver understands it. */
export const toValidRange = (range: string): string | undefined => {
  if (!range) return undefined;
  return semver.validRange(range) ?? semver.validRange(range.replace(/V(?=\d)/g, 'v')) ?? undefined;
};

/** True when the value can be used to reference another resource: `latest`, a version, or a range. */
export const isValidVersionReference = (reference: string): boolean =>
  reference === LATEST || isComparableVersion(reference) || toValidRange(reference) !== undefined;

export const versionSatisfiesRange = (version: string, range: string): boolean => {
  const comparableVersion = toComparableVersion(version);
  const comparableRange = toValidRange(range);

  if (!comparableVersion || !comparableRange) return false;

  return semver.satisfies(comparableVersion, comparableRange);
};

export const compareVersions = (a: string, b: string): number | undefined => {
  const left = toComparableVersion(a);
  const right = toComparableVersion(b);
  if (!left || !right) return undefined;
  return semver.compare(left, right);
};

export const isSameVersion = (a: string | undefined, b: string | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return compareVersions(a, b) === 0;
};

/**
 * Does an available resource version satisfy a version reference? Mirrors core's `versionMatches`:
 * `latest` matches anything, then exact match, then semver range, then `1.x` style prefixes.
 */
export const versionMatches = (version: string, reference: string): boolean => {
  if (reference === LATEST) return true;
  if (version === reference) return true;
  if (isSameVersion(version, reference)) return true;
  if (versionSatisfiesRange(version, reference)) return true;

  if (reference.includes('.x')) {
    const prefix = reference.replace(/\.x/g, '');
    if (version.startsWith(prefix)) {
      const nextChar = version[prefix.length];
      return nextChar === '.' || nextChar === undefined;
    }
  }

  return false;
};

/** Sorts versions newest first. Non-comparable versions fall back to reverse string order (like core). */
export const sortVersions = (versions: string[]): string[] => {
  const unique = [...new Set(versions)];
  if (unique.every((version) => isComparableVersion(version))) {
    return unique.sort((a, b) => compareVersions(b, a)!);
  }
  return unique.sort((a, b) => b.localeCompare(a));
};
