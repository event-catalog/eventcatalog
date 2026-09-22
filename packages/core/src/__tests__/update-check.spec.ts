import { describe, expect, it } from 'vitest';
import { getEventCatalogUpdateMessage, resolveInstalledCoreVersion } from '../update-check';

const banner = (current: string, latest: string) =>
  `EventCatalog update available ${current} → ${latest}\nRun npm i @eventcatalog/core to update`;

describe('resolveInstalledCoreVersion', () => {
  it('uses the running version when the catalog dependency is a range', () => {
    expect(resolveInstalledCoreVersion('4.10.0', '^4.10.0')).toBe('4.10.0');
  });

  it('does not treat a range as the installed version', () => {
    expect(resolveInstalledCoreVersion('not-a-version', '^4.10.0')).toBeNull();
  });

  it('falls back to an exact pin when the running version is not semver', () => {
    expect(resolveInstalledCoreVersion('not-a-version', '4.10.10')).toBe('4.10.10');
  });
});

describe('getEventCatalogUpdateMessage', () => {
  it('does not let a range declaration suppress a newer published version', () => {
    const current = resolveInstalledCoreVersion('4.10.0', '^4.10.0');

    expect(current).toBe('4.10.0');
    expect(getEventCatalogUpdateMessage(current!, '4.11.0')).toBe(banner('4.10.0', '4.11.0'));
  });

  it('does not suggest an update when the installed version is newer than latest', () => {
    const current = resolveInstalledCoreVersion('4.11.0', '^4.10.0');

    expect(getEventCatalogUpdateMessage(current!, '4.10.10')).toBeNull();
  });

  it('does not suggest an update when the installed version equals latest', () => {
    expect(getEventCatalogUpdateMessage('4.11.0', '4.11.0')).toBeNull();
  });

  it('suggests an update when a pinned install is older than latest', () => {
    const current = resolveInstalledCoreVersion('4.10.10', '4.10.10');

    expect(getEventCatalogUpdateMessage(current!, '4.11.0')).toBe(banner('4.10.10', '4.11.0'));
  });

  it('compares versions with semver so 4.10.10 is newer than 4.10.9', () => {
    expect(getEventCatalogUpdateMessage('4.10.9', '4.10.10')).toBe(banner('4.10.9', '4.10.10'));
  });

  it('does not suggest an update when latest is missing or not valid semver', () => {
    expect(getEventCatalogUpdateMessage('4.11.0', undefined)).toBeNull();
    expect(getEventCatalogUpdateMessage('4.11.0', 'latest')).toBeNull();
    expect(getEventCatalogUpdateMessage('^4.11.0', '4.12.0')).toBeNull();
  });
});
