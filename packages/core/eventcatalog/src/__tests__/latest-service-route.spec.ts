import { describe, expect, it } from 'vitest';

import { toLatestServicePaths } from '../pages/docs/services/_latest-version-route';

describe('latest service routes', () => {
  it('creates versionless aliases for latest service paths only', () => {
    const paths = [
      {
        params: { type: 'services', id: 'Orders', version: '2.0.0', filename: 'orders' },
        props: { marker: 'latest' },
      },
      {
        params: { type: 'services', id: 'Orders', version: '1.0.0', filename: 'orders' },
        props: { marker: 'historical' },
      },
      {
        params: { type: 'domains', id: 'Orders', version: '2.0.0', filename: 'orders' },
        props: { marker: 'domain' },
      },
    ];
    const latestServices = [{ data: { id: 'Orders', version: '2.0.0' } }] as any;

    expect(toLatestServicePaths(paths, latestServices)).toEqual([
      {
        params: { id: 'Orders', filename: 'orders' },
        props: { marker: 'latest', redirectVersion: '2.0.0' },
      },
    ]);
  });
});
