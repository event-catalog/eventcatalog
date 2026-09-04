import { coerce, compare, valid } from 'semver';

/** Accepts strict semver and number-like versions such as `1`, `v1`, `1.2`. */
const toComparable = (version: string) => valid(version) ?? coerce(version)?.version ?? undefined;

/**
 * Orders two version strings. Semver-like versions are compared numerically,
 * anything else falls back to a plain string compare so the result is still stable.
 */
export const compareVersions = (left: string | undefined, right: string | undefined): number => {
  const a = left ? toComparable(left) : undefined;
  const b = right ? toComparable(right) : undefined;

  if (a && b) return compare(a, b);
  return (left ?? '').localeCompare(right ?? '');
};

/** Picks the item with the highest version. */
export const latest = <T extends { version?: string }>(items: T[]): T | undefined =>
  items.reduce<T | undefined>(
    (best, item) => (best && compareVersions(best.version, item.version) >= 0 ? best : item),
    undefined
  );
