import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('nesting');
setup();

function existsInCatalog(...segments: string[]): boolean {
  return fs.existsSync(path.join(catalogPath, ...segments));
}

describe('import nested structure', () => {
  it('nests services inside domains by default', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 1.0.0
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDomain('Payment', '1.0.0')).toBeDefined();
    expect(await sdk.getService('OrderService', '1.0.0')).toBeDefined();

    // Service should be nested under domain
    expect(existsInCatalog('domains', 'Payment', 'services', 'OrderService')).toBe(true);
  });

  it('nests services inside subdomains', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Ecommerce {
  version 1.0.0
  subdomain Payments {
    version 1.0.0
    service PaymentService {
      version 1.0.0
    }
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDomain('Ecommerce', '1.0.0')).toBeDefined();
    expect(await sdk.getService('PaymentService', '1.0.0')).toBeDefined();

    // Service should be nested under subdomain
    expect(existsInCatalog('domains', 'Ecommerce', 'subdomains', 'Payments', 'services', 'PaymentService')).toBe(true);
  });

  it('nests inline messages under service path', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 1.0.0
    sends event OrderCreated {
      version 1.0.0
    }
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();

    // Event should be nested under the service under the domain
    expect(existsInCatalog('domains', 'Payment', 'services', 'OrderService', 'events', 'OrderCreated')).toBe(true);
  });

  it('nests message stubs under parent service', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 1.0.0
    sends event OrderCreated
    receives command PlaceOrder
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('OrderCreated', '0.0.1')).toBeDefined();
    expect(await sdk.getCommand('PlaceOrder', '0.0.1')).toBeDefined();

    // Stubs should be nested under the service
    expect(existsInCatalog('domains', 'Payment', 'services', 'OrderService', 'events', 'OrderCreated')).toBe(true);
    expect(existsInCatalog('domains', 'Payment', 'services', 'OrderService', 'commands', 'PlaceOrder')).toBe(true);
  });

  it('nests channel stubs under domain', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 1.0.0
    sends event OrderCreated to orders-topic
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getChannel('orders-topic', '0.0.1')).toBeDefined();

    // Channel stub should be under the domain
    expect(existsInCatalog('domains', 'Payment', 'channels', 'orders-topic')).toBe(true);
  });

  it('produces flat structure with --flat flag', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 1.0.0
    sends event OrderCreated {
      version 1.0.0
    }
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath, flat: true });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDomain('Payment', '1.0.0')).toBeDefined();
    expect(await sdk.getService('OrderService', '1.0.0')).toBeDefined();
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();

    // With flat, services and events should be at top level
    expect(existsInCatalog('services', 'OrderService')).toBe(true);
    expect(existsInCatalog('events', 'OrderCreated')).toBe(true);
    // Should NOT be nested under domain
    expect(existsInCatalog('domains', 'Payment', 'services')).toBe(false);
  });

  it('writes to existing location when resource already exists', async () => {
    // Pre-create a service at a flat location
    const sdk = createSDK(catalogPath);
    await sdk.writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      markdown: 'existing docs',
    });

    // Verify it exists at flat location
    expect(existsInCatalog('services', 'OrderService')).toBe(true);

    // Now import with nesting — the service is inside a domain
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 1.0.0
    name "Updated Order Service"
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    // Resource should be updated at its existing flat location
    const updated = await sdk.getService('OrderService', '1.0.0');
    expect(updated).toBeDefined();
    expect(updated!.name).toBe('Updated Order Service');

    // It should still be at the flat location (existing takes precedence)
    expect(existsInCatalog('services', 'OrderService')).toBe(true);
  });

  it('top-level service (no domain) still goes to services/', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service StandaloneService {
  version 1.0.0
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    expect(existsInCatalog('services', 'StandaloneService')).toBe(true);
  });

  it('uses subdomains path instead of domains for subdomain output', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Ecommerce {
  version 1.0.0
  subdomain Payments {
    version 1.0.0
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    // Subdomain should use subdomains/ not domains/
    expect(existsInCatalog('domains', 'Ecommerce', 'subdomains', 'Payments')).toBe(true);
    expect(existsInCatalog('domains', 'Ecommerce', 'domains', 'Payments')).toBe(false);
  });

  it('domain frontmatter lists its services', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  service OrderService {
    version 2.0.0
  }
  service RefundService {
    version 1.0.0
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const domain = await sdk.getDomain('Payment', '1.0.0');
    expect(domain).toBeDefined();
    expect(domain!.services).toBeDefined();
    expect(domain!.services).toHaveLength(2);
    expect(domain!.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'OrderService', version: '2.0.0' }),
        expect.objectContaining({ id: 'RefundService', version: '1.0.0' }),
      ])
    );
  });
});
