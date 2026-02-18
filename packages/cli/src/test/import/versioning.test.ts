import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import path from 'node:path';
import fs from 'node:fs';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('versioning');
setup();

describe('import versioning', () => {
  it('versions existing resource when importing a newer version', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeService({ id: 'PaymentService', name: 'Payment Service', version: '1.0.0', markdown: '' });

    expect(fs.existsSync(path.join(catalogPath, 'services/PaymentService/index.mdx'))).toBe(true);

    const ecFile = writeEcFile(
      'test.ec',
      `service PaymentService {
  version 2.0.0
  name "Payment Service V2"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 1 resource(s)');

    // v1 should now be in versioned/
    expect(fs.existsSync(path.join(catalogPath, 'services/PaymentService/versioned/1.0.0/index.mdx'))).toBe(true);

    // v2 should be at root
    const sdk2 = createSDK(catalogPath);
    const latest = await sdk2.getService('PaymentService');
    expect(latest!.version).toBe('2.0.0');
    expect(latest!.name).toBe('Payment Service V2');
  });

  it('overrides existing resource when same version already exists', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeEvent({
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      summary: 'original summary',
      markdown: 'original docs',
    } as any);

    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created V2"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Updated 1 resource(s)');

    const sdk2 = createSDK(catalogPath);
    const event = await sdk2.getEvent('OrderCreated', '1.0.0');
    expect(event!.name).toBe('Order Created V2');
    // summary NOT preserved — full override, not merge
    expect((event as any).summary).toBeUndefined();
  });
});
