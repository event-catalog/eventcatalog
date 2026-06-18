import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { extractResourceInfo, scanCatalogFiles } from '../src/scanner';

describe('extractResourceInfo', () => {
  it('should extract simple resource id', () => {
    const result = extractResourceInfo('services/user-service/index.mdx', 'service');
    expect(result).toEqual({ id: 'user-service' });
  });

  it('should extract resource id with versioned structure', () => {
    const result = extractResourceInfo('services/user-service/versioned/1.0.0/index.mdx', 'service');
    expect(result).toEqual({ id: 'user-service', version: '1.0.0' });
  });

  it('should extract subdomain service id', () => {
    const result = extractResourceInfo('domains/sales/subdomains/orders/services/inventory-service/index.mdx', 'service');
    expect(result).toEqual({ id: 'inventory-service' });
  });

  it('should extract subdomain service with version', () => {
    const result = extractResourceInfo(
      'domains/sales/subdomains/orders/services/inventory-service/versioned/2.1.0/index.mdx',
      'service'
    );
    expect(result).toEqual({ id: 'inventory-service', version: '2.1.0' });
  });

  it('should extract domain with subdomain', () => {
    const result = extractResourceInfo('domains/sales/subdomains/orders/index.mdx', 'domain');
    expect(result).toEqual({ id: 'sales/subdomains/orders' });
  });

  it('should extract domain with versioned structure', () => {
    const result = extractResourceInfo('domains/sales/versioned/2.1.0/index.mdx', 'domain');
    expect(result).toEqual({ id: 'sales', version: '2.1.0' });
  });

  it('should extract user id from filename', () => {
    const result = extractResourceInfo('users/john-doe.mdx', 'user');
    expect(result).toEqual({ id: 'john-doe' });
  });

  it('should extract team id from filename', () => {
    const result = extractResourceInfo('teams/platform-team.mdx', 'team');
    expect(result).toEqual({ id: 'platform-team' });
  });

  it('should extract nested container id', () => {
    const result = extractResourceInfo('domains/sales/services/order-service/containers/orders-db/index.mdx', 'container');
    expect(result).toEqual({ id: 'orders-db' });
  });

  it('should extract data product id from data-products folders', () => {
    const result = extractResourceInfo('domains/sales/data-products/order-metrics/versioned/1.0.0/index.mdx', 'dataProduct');
    expect(result).toEqual({ id: 'order-metrics', version: '1.0.0' });
  });

  it('should extract nested diagram id', () => {
    const result = extractResourceInfo('domains/sales/diagrams/order-flow/versioned/1.0.0/index.mdx', 'diagram');
    expect(result).toEqual({ id: 'order-flow', version: '1.0.0' });
  });

  it('should extract adr id', () => {
    const result = extractResourceInfo('adrs/adr-001/index.md', 'adr');
    expect(result).toEqual({ id: 'adr-001' });
  });

  it('should scan newer resource types', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-linter-scanner-'));
    const files = [
      'domains/sales/agents/refund-agent/index.mdx',
      'domains/sales/data-products/order-metrics/index.mdx',
      'domains/sales/services/order-service/containers/orders-db/index.mdx',
      'domains/sales/diagrams/order-flow/index.mdx',
      'adrs/adr-001/index.md',
    ];

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(rootDir, file);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '---\nid: test\nname: Test\nversion: 1.0.0\n---\n');
      })
    );

    const catalogFiles = await scanCatalogFiles(rootDir);
    expect(catalogFiles.map((file) => file.resourceType).sort()).toEqual(['adr', 'agent', 'container', 'dataProduct', 'diagram']);
  });
});
