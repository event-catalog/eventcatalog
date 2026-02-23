import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('resource-types');
setup();

function existsInCatalog(...segments: string[]): boolean {
  return fs.existsSync(path.join(catalogPath, ...segments));
}

describe('import additional resource types', () => {
  it('imports containers, data products, and diagrams', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `container orders-db {
  version 1.0.0
  name "Orders DB"
  summary "Orders database"
  container-type database
}

data-product CustomerAnalytics {
  version 1.0.0
  name "Customer Analytics"
  summary "Customer analytics data product"
}

diagram system-overview {
  version 1.0.0
  name "System Overview"
  summary "High-level architecture diagram"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 3 resource(s)');
    expect(result).toContain('orders-db@1.0.0');
    expect(result).toContain('CustomerAnalytics@1.0.0');
    expect(result).toContain('system-overview@1.0.0');
    expect(result).not.toContain('unsupported resource type');

    const sdk = createSDK(catalogPath);
    const container = await sdk.getDataStore('orders-db', '1.0.0');
    const dataProduct = await sdk.getDataProduct('CustomerAnalytics', '1.0.0');
    const diagram = await sdk.getDiagram('system-overview', '1.0.0');

    expect(container).toBeDefined();
    expect(container!.name).toBe('Orders DB');
    expect(container!.markdown).not.toContain('<NodeGraph />');
    expect(dataProduct).toBeDefined();
    expect(dataProduct!.name).toBe('Customer Analytics');
    expect(dataProduct!.markdown).not.toContain('<NodeGraph />');
    expect(diagram).toBeDefined();
    expect(diagram!.name).toBe('System Overview');
    expect(diagram!.markdown).not.toContain('<NodeGraph />');
  });

  it('dry-run reports updates for existing containers', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeDataStore({
      id: 'orders-db',
      name: 'Orders DB',
      version: '1.0.0',
      summary: 'Orders database',
      markdown: '',
      container_type: 'database',
    });

    const ecFile = writeEcFile(
      'test.ec',
      `container orders-db {
  version 1.0.0
  name "Orders DB Updated"
  summary "Orders database"
  container-type database
}`
    );

    const result = await importDSL({ files: [ecFile], dryRun: true, dir: catalogPath });

    expect(result).toContain('Would update 1 resource(s)');
    expect(result).toContain('orders-db@1.0.0');
  });

  it('normalizes container fields to SDK/core naming', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `container orders-db {
  version 1.0.0
  name "Orders DB"
  summary "Orders database"
  container-type database
  access-mode readWrite
  classification internal
  residency "eu-west-1"
  retention "P90D"
  authoritative true
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const container: any = await sdk.getDataStore('orders-db', '1.0.0');
    expect(container).toBeDefined();
    expect(container.container_type).toBe('database');
    expect(container.access_mode).toBe('readWrite');
    expect(container.containerType).toBeUndefined();
    expect(container.accessMode).toBeUndefined();
  });

  it('nests domain containers by default', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  container payment-db {
    version 1.0.0
    container-type database
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDataStore('payment-db', '1.0.0')).toBeDefined();
    expect(existsInCatalog('domains', 'Payment', 'containers', 'payment-db')).toBe(true);
  });

  it('writes domain containers to top-level with --flat', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Payment {
  version 1.0.0
  container payment-db {
    version 1.0.0
    container-type database
  }
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath, flat: true });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getDataStore('payment-db', '1.0.0')).toBeDefined();
    expect(existsInCatalog('containers', 'payment-db')).toBe(true);
    expect(existsInCatalog('domains', 'Payment', 'containers', 'payment-db')).toBe(false);
  });

  it('versions existing data products when importing a newer version', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeDataProduct({
      id: 'CustomerAnalytics',
      name: 'Customer Analytics',
      version: '1.0.0',
      summary: 'v1',
      markdown: '',
    });

    const ecFile = writeEcFile(
      'test.ec',
      `data-product CustomerAnalytics {
  version 2.0.0
  name "Customer Analytics V2"
  summary "v2"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });
    expect(result).toContain('Created 1 resource(s)');
    expect(result).toContain('Versioned 1 existing resource(s)');
    expect(result).toContain('CustomerAnalytics@1.0.0');

    expect(existsInCatalog('data-products', 'CustomerAnalytics', 'versioned', '1.0.0', 'index.mdx')).toBe(true);
    const latest = await sdk.getDataProduct('CustomerAnalytics');
    expect(latest).toBeDefined();
    expect(latest!.version).toBe('2.0.0');
    expect(latest!.name).toBe('Customer Analytics V2');
  });

  it('updates existing diagrams when importing the same version', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeDiagram({
      id: 'system-overview',
      name: 'System Overview',
      version: '1.0.0',
      summary: 'old summary',
      markdown: '',
    });

    const ecFile = writeEcFile(
      'test.ec',
      `diagram system-overview {
  version 1.0.0
  name "System Overview Updated"
  summary "new summary"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });
    expect(result).toContain('Updated 1 resource(s)');

    const updated = await sdk.getDiagram('system-overview', '1.0.0');
    expect(updated).toBeDefined();
    expect(updated!.name).toBe('System Overview Updated');
    expect(updated!.markdown).not.toContain('<NodeGraph />');
  });
});
