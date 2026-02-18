import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('domains');
setup();

describe('import domains', () => {
  it('imports a domain', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Order management"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 1 resource(s)');

    const sdk = createSDK(catalogPath);
    const domain = await sdk.getDomain('Orders', '1.0.0');
    expect(domain).toBeDefined();
    expect(domain!.name).toBe('Orders Domain');
  });

  it('adds <NodeGraph /> to markdown for newly created domains', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `domain Orders {
  version 1.0.0
  name "Orders Domain"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const domain = await sdk.getDomain('Orders', '1.0.0');
    expect(domain).toBeDefined();
    expect(domain!.markdown).toContain('<NodeGraph />');
  });
});
