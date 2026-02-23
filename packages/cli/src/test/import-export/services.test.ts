import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('services');
setup();

describe('import services', () => {
  it('writes service to root when no existing version exists', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service PaymentService {
  version 2.0.0
  name "Payment Service"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const service = await sdk.getService('PaymentService', '2.0.0');
    expect(service).toBeDefined();
    expect(service!.name).toBe('Payment Service');
  });

  it('imports a service with inline messages', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated {
    version 1.0.0
    name "Order Created"
    summary "An order was created"
  }
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 2 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getService('OrderService', '1.0.0')).toBeDefined();
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
  });

  it('overrides existing sends/receives when same version exists', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await sdk.writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: 'existing service docs',
    });

    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Updated 1 resource(s)');

    const sdk2 = createSDK(catalogPath);
    const service = await sdk2.getService('OrderService', '1.0.0');
    expect(service!.name).toBe('Order Service Updated');
    expect((service as any).sends).toBeUndefined();
  });

  it('adds <NodeGraph /> to markdown for newly created services', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service PaymentService {
  version 1.0.0
  name "Payment Service"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const service = await sdk.getService('PaymentService', '1.0.0');
    expect(service).toBeDefined();
    expect(service!.markdown).toContain('<NodeGraph />');
  });
});
