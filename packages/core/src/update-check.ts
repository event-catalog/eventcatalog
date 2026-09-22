import { gt, valid } from 'semver';

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
