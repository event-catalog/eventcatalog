import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

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

  it('writes resources to configured contentDir while --dir remains the project directory', async () => {
    const contentPath = path.join(catalogPath, 'catalog-content');
    fs.rmSync(contentPath, { recursive: true, force: true });
    fs.mkdirSync(contentPath, { recursive: true });
    fs.writeFileSync(
      path.join(catalogPath, 'eventcatalog.config.js'),
      `export default { contentDir: './catalog-content' };\n`,
      'utf-8'
    );

    const ecFile = writeEcFile(
      'content-dir.ec',
      `domain Orders {
  version 1.0.0
  name "Orders"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    expect(fs.existsSync(path.join(contentPath, 'domains', 'Orders', 'index.mdx'))).toBe(true);
    expect(fs.existsSync(path.join(catalogPath, 'domains', 'Orders', 'index.mdx'))).toBe(false);

    const sdk = createSDK(contentPath);
    expect(await sdk.getDomain('Orders', '1.0.0')).toBeDefined();

    fs.rmSync(contentPath, { recursive: true, force: true });
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

  it('handles duplicate definitions in a single import run with create then update semantics', async () => {
    const file1 = writeEcFile(
      'first.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created V1"
}`
    );
    const file2 = writeEcFile(
      'second.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created V2"
}`
    );

    const result = await importDSL({
      files: [file1, file2],
      dir: catalogPath,
    });

    expect(result).toContain('Created 1 resource(s)');
    expect(result).toContain('Updated 1 resource(s)');

    const sdk = createSDK(catalogPath);
    const event = await sdk.getEvent('OrderCreated', '1.0.0');
    expect(event).toBeDefined();
    expect(event!.name).toBe('Order Created V2');
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
