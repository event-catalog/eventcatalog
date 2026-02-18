import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('events');
setup();

describe('import events', () => {
  it('imports a single event from a .ec file', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "An order was created"
}`
    );

    const result = await importDSL({
      files: [ecFile],
      dir: catalogPath,
    });

    expect(result).toContain('Created 1 resource(s)');
    expect(result).toContain('OrderCreated@1.0.0');

    const sdk = createSDK(catalogPath);
    const event = await sdk.getEvent('OrderCreated', '1.0.0');
    expect(event).toBeDefined();
    expect(event!.name).toBe('Order Created');
  });

  it('imports resource without version to root folder', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event SimpleEvent {
  name "Simple Event"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 1 resource(s)');

    const sdk = createSDK(catalogPath);
    const event = await sdk.getEvent('SimpleEvent');
    expect(event).toBeDefined();
    expect(event!.name).toBe('Simple Event');
  });

  it('adds <NodeGraph /> to markdown for newly created events', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const event = await sdk.getEvent('OrderCreated', '1.0.0');
    expect(event).toBeDefined();
    expect(event!.markdown).toContain('<NodeGraph />');
  });

  it('does not add <NodeGraph /> when updating an existing event', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeEvent({
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      markdown: 'existing docs',
    });

    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created V2"
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk2 = createSDK(catalogPath);
    const event = await sdk2.getEvent('OrderCreated', '1.0.0');
    expect(event).toBeDefined();
    expect(event!.markdown).not.toContain('<NodeGraph />');
  });
});
