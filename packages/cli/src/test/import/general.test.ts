import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('general');
setup();

describe('import general', () => {
  it('imports multiple resource types from a single .ec file', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}`
    );

    const result = await importDSL({
      files: [ecFile],
      dir: catalogPath,
    });

    expect(result).toContain('Created 2 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
    expect(await sdk.getService('OrderService', '1.0.0')).toBeDefined();
  });

  it('imports from multiple .ec files', async () => {
    const file1 = writeEcFile(
      'events.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}`
    );
    const file2 = writeEcFile(
      'commands.ec',
      `command CreateOrder {
  version 1.0.0
  name "Create Order"
}`
    );

    const result = await importDSL({
      files: [file1, file2],
      dir: catalogPath,
    });

    expect(result).toContain('Created 2 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
    expect(await sdk.getCommand('CreateOrder', '1.0.0')).toBeDefined();
  });

  it('handles mix of new and existing resources', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 1 resource(s)');
    expect(result).toContain('Updated 1 resource(s)');

    const sdk2 = createSDK(catalogPath);
    expect(await sdk2.getCommand('CreateOrder', '1.0.0')).toBeDefined();
  });

  it('previews without writing with --dry-run', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
}`
    );

    const result = await importDSL({ files: [ecFile], dryRun: true, dir: catalogPath });

    expect(result).toContain('DRY RUN');
    expect(result).toContain('Would create 2 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeUndefined();
  });

  it('dry-run reports update when resource already exists', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created Updated"
}`
    );

    const result = await importDSL({ files: [ecFile], dryRun: true, dir: catalogPath });

    expect(result).toContain('Would update 1 resource(s)');
  });

  it('throws on parse errors', async () => {
    const ecFile = writeEcFile('bad.ec', 'this is not valid DSL {{{{');

    await expect(importDSL({ files: [ecFile], dir: catalogPath })).rejects.toThrow('Parse errors');
  });

  it('throws when file not found', async () => {
    await expect(importDSL({ files: ['/nonexistent/path/test.ec'], dir: catalogPath })).rejects.toThrow('File not found');
  });

  it('throws when no files or stdin provided', async () => {
    await expect(importDSL({ dir: catalogPath })).rejects.toThrow('Either provide .ec file paths or use --stdin');
  });
});
