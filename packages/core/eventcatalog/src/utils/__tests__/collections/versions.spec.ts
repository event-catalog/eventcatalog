import { getVersionFromCollection } from '@utils/collections/versions';
import { describe, expect, it } from 'vitest';

describe('getVersionFromCollection', () => {
  const versions = ['V1', 'V10', 'V2'].map((version) => ({ data: { id: 'OrderPlaced', version } }));

  it('returns the latest V-prefixed integer version', () => {
    expect(getVersionFromCollection(versions as any, 'OrderPlaced')[0].data.version).toBe('V10');
  });

  it('returns a requested V-prefixed integer version', () => {
    expect(getVersionFromCollection(versions as any, 'OrderPlaced', 'V1')[0].data.version).toBe('V1');
  });

  it('returns an exact custom string version', () => {
    const customVersions = ['draft', 'release'].map((version) => ({ data: { id: 'OrderPlaced', version } }));

    expect(getVersionFromCollection(customVersions as any, 'OrderPlaced', 'draft')[0].data.version).toBe('draft');
  });
});
