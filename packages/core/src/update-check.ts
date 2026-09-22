import { gt, valid } from 'semver';

/**
 * Version to compare with the published release.
 *
 * Prefer the running CLI version. The catalog `package.json` dependency is often
 * a range (`^4.10.0`) and is not the installed package. An exact pin is used
 * only when the running version itself is not semver.
 */
export const resolveInstalledCoreVersion = (runningVersion: string, declaredDependency?: string | null): string | null => {
  if (valid(runningVersion)) return runningVersion;
  if (declaredDependency && valid(declaredDependency)) return declaredDependency;
  return null;
};

/**
 * Message for the CLI update banner, or null when no update should be shown.
 *
 * `update-notifier` treats any semver difference as an update, including when the
 * installed release is newer than the cached or tagged "latest". Only a strictly
 * newer published version is an update.
 */
export const getEventCatalogUpdateMessage = (current: string, latest: string | undefined): string | null => {
  if (!latest || !valid(current) || !valid(latest) || !gt(latest, current)) {
    return null;
  }

  return `EventCatalog update available ${current} → ${latest}
Run npm i @eventcatalog/core to update`;
};
