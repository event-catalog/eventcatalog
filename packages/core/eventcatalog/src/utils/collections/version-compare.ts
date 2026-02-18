import { coerce, eq } from 'semver';

export function isSameVersion(v1: string | undefined, v2: string | undefined) {
  const semverV1 = coerce(v1);
  const semverV2 = coerce(v2);

  if (semverV1 != null && semverV2 != null) {
    return eq(semverV1, semverV2);
  }

  return v1 === v2;
}
