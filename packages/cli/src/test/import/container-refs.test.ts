import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('container-refs');
setup();

function existsInCatalog(...segments: string[]): boolean {
  return fs.existsSync(path.join(catalogPath, ...segments));
}

describe('import container refs', () => {
  it('imports writes-to and reads-from refs on services', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `container OrdersDb {
  version 1.0.0
  name "Orders DB"
  container-type database
}

container OrdersCache {
  version 1.0.0
  name "Orders Cache"
  container-type cache
}

service OrderService {
  version 1.0.0
  name "Order Service"
  writes-to container OrdersDb@1.0.0
  reads-from container OrdersCache
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });
    expect(result).toContain('Created 3 resource(s)');

    const sdk = createSDK(catalogPath);
    const service: any = await sdk.getService('OrderService', '1.0.0');
    expect(service).toBeDefined();
    expect(service.writesTo).toEqual([{ id: 'OrdersDb', version: '1.0.0' }]);
    expect(service.readsFrom).toEqual([{ id: 'OrdersCache' }]);
  });

  it('creates container stubs for writes-to/reads-from refs without standalone definitions', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service AnalyticsService {
  version 1.0.0
  writes-to container AnalyticsStore
  reads-from container ReportsStore@2.0.0
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });
    expect(result).toContain('Created 3 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDataStore('AnalyticsStore', '0.0.1')).toBeDefined();
    expect(await sdk.getDataStore('ReportsStore', '2.0.0')).toBeDefined();

    const service: any = await sdk.getService('AnalyticsService', '1.0.0');
    expect(service.writesTo).toEqual([{ id: 'AnalyticsStore' }]);
    expect(service.readsFrom).toEqual([{ id: 'ReportsStore', version: '2.0.0' }]);
  });

  it('nests container stubs under the domain by default', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payments {
  version 1.0.0
  service SettlementService {
    version 1.0.0
    writes-to container LedgerDb
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDataStore('LedgerDb', '0.0.1')).toBeDefined();
    expect(existsInCatalog('domains', 'Payments', 'containers', 'LedgerDb')).toBe(true);
  });
});
