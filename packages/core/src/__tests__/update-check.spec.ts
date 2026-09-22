import { describe, expect, it } from 'vitest';
import { getEventCatalogUpdateMessage } from '../update-check';

const banner = (current: string, latest: string) =>
  `EventCatalog update available ${current} → ${latest}\nRun npm i @eventcatalog/core to update`;

describe('getEventCatalogUpdateMessage', () => {
  it('does not suggest an update when the installed version is newer than latest', () => {
    expect(getEventCatalogUpdateMessage('4.11.0', '4.10.10')).toBeNull();
  });

  it('does not suggest an update when the installed version equals latest', () => {
    expect(getEventCatalogUpdateMessage('4.11.0', '4.11.0')).toBeNull();
  });

  it('suggests an update when a newer published version exists', () => {
    expect(getEventCatalogUpdateMessage('4.10.10', '4.11.0')).toBe(banner('4.10.10', '4.11.0'));
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
