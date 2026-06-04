import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getMessageSchemasFromFrontmatter, loadMessageSchemas } from '@utils/collections/schema-loader';

const originalScale = process.env.EVENTCATALOG_SCALE;

describe('schema-loader', () => {
  beforeEach(() => {
    delete process.env.EVENTCATALOG_SCALE;
  });

  afterEach(() => {
    if (originalScale === undefined) {
      delete process.env.EVENTCATALOG_SCALE;
      return;
    }
    process.env.EVENTCATALOG_SCALE = originalScale;
  });

  it('normalizes legacy schemaPath into a generated message schema resource', () => {
    const schemas = getMessageSchemasFromFrontmatter({
      collection: 'commands',
      messageFilePath: '/catalog/commands/CancelShipment/index.mdx',
      data: {
        id: 'CancelShipment',
        name: 'Cancel shipment',
        version: '0.0.1',
        summary: 'Cancels a shipment',
        owners: ['dboyne'],
        schemaPath: 'schema.json',
      },
    });

    expect(schemas).toEqual([
      {
        id: 'schema:commands:CancelShipment:0.0.1:schema.json',
        name: 'Schema',
        version: '0.0.1',
        format: 'jsonschema',
        file: 'schema.json',
        filePath: '/catalog/commands/CancelShipment/schema.json',
        environments: undefined,
        default: true,
        message: {
          collection: 'commands',
          id: 'CancelShipment',
          name: 'Cancel shipment',
          version: '0.0.1',
          summary: 'Cancels a shipment',
          owners: ['dboyne'],
        },
        source: {
          provider: 'file',
          path: 'schema.json',
        },
      },
    ]);
  });

  it('normalizes explicit message schemas with environment metadata', () => {
    const schemas = getMessageSchemasFromFrontmatter({
      collection: 'events',
      messageFilePath: '/catalog/events/ShipmentCancelled/index.mdx',
      data: {
        id: 'ShipmentCancelled',
        name: 'Shipment cancelled',
        version: '1.0.0',
        summary: 'A shipment was cancelled',
        owners: ['shipping-team'],
        schemas: [
          {
            id: 'shipment-cancelled-prod',
            file: 'schema.prod.avsc',
            name: 'Production',
            environments: ['prod'],
            default: true,
          },
          {
            id: 'shipment-cancelled-uat',
            file: 'schema.uat.avsc',
            name: 'UAT',
            environments: ['uat'],
          },
        ],
      },
    });

    expect(schemas).toEqual([
      {
        id: 'shipment-cancelled-prod',
        name: 'Production',
        version: '1.0.0',
        format: 'avro',
        file: 'schema.prod.avsc',
        filePath: '/catalog/events/ShipmentCancelled/schema.prod.avsc',
        environments: ['prod'],
        default: true,
        message: {
          collection: 'events',
          id: 'ShipmentCancelled',
          name: 'Shipment cancelled',
          version: '1.0.0',
          summary: 'A shipment was cancelled',
          owners: ['shipping-team'],
        },
        source: {
          provider: 'file',
          path: 'schema.prod.avsc',
        },
      },
      {
        id: 'shipment-cancelled-uat',
        name: 'UAT',
        version: '1.0.0',
        format: 'avro',
        file: 'schema.uat.avsc',
        filePath: '/catalog/events/ShipmentCancelled/schema.uat.avsc',
        environments: ['uat'],
        default: undefined,
        message: {
          collection: 'events',
          id: 'ShipmentCancelled',
          name: 'Shipment cancelled',
          version: '1.0.0',
          summary: 'A shipment was cancelled',
          owners: ['shipping-team'],
        },
        source: {
          provider: 'file',
          path: 'schema.uat.avsc',
        },
      },
    ]);
  });

  it('normalizes external schema references without local file metadata', () => {
    const schemas = getMessageSchemasFromFrontmatter({
      collection: 'events',
      messageFilePath: '/catalog/events/ShipmentCancelled/index.mdx',
      data: {
        id: 'ShipmentCancelled',
        version: '1.0.0',
        schemas: [{ ref: 'git://contracts/events/ShipmentCancelled.schema.json', environments: ['prod'] }],
      },
    });

    expect(schemas).toEqual([
      {
        id: 'git://contracts/events/ShipmentCancelled.schema.json',
        ref: 'git://contracts/events/ShipmentCancelled.schema.json',
        name: undefined,
        version: '1.0.0',
        format: 'unknown',
        file: undefined,
        filePath: undefined,
        environments: ['prod'],
        default: undefined,
        message: {
          collection: 'events',
          id: 'ShipmentCancelled',
          name: undefined,
          version: '1.0.0',
          summary: undefined,
          owners: undefined,
        },
        source: {
          provider: 'git',
          path: undefined,
        },
      },
    ]);
  });

  it('normalizes legacy external schema references that use id', () => {
    const schemas = getMessageSchemasFromFrontmatter({
      collection: 'events',
      messageFilePath: '/catalog/events/ShipmentCancelled/index.mdx',
      data: {
        id: 'ShipmentCancelled',
        version: '1.0.0',
        schemas: [{ id: 'git://contracts/events/ShipmentCancelled.schema.json' }],
      },
    });

    expect(schemas).toMatchObject([
      {
        id: 'git://contracts/events/ShipmentCancelled.schema.json',
        ref: 'git://contracts/events/ShipmentCancelled.schema.json',
        source: {
          provider: 'git',
        },
      },
    ]);
  });

  it('normalizes file schema refs relative to the message file', () => {
    const schemas = getMessageSchemasFromFrontmatter({
      collection: 'events',
      messageFilePath: '/catalog/events/OrderPlaced/index.mdx',
      data: {
        id: 'OrderPlaced',
        version: '1.0.0',
        schemas: [{ ref: 'file://./schemas/OrderPlaced.schema.json' }],
      },
    });

    expect(schemas).toEqual([
      {
        id: 'file://./schemas/OrderPlaced.schema.json',
        ref: 'file://./schemas/OrderPlaced.schema.json',
        name: 'OrderPlaced.schema.json',
        version: '1.0.0',
        format: 'jsonschema',
        file: undefined,
        filePath: '/catalog/events/OrderPlaced/schemas/OrderPlaced.schema.json',
        environments: undefined,
        default: undefined,
        message: {
          collection: 'events',
          id: 'OrderPlaced',
          name: undefined,
          version: '1.0.0',
          summary: undefined,
          owners: undefined,
        },
        source: {
          provider: 'file',
          path: './schemas/OrderPlaced.schema.json',
        },
      },
    ]);
  });

  it('loads colocated schemas from message files using raw glob patterns', async () => {
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'domains', 'Orders', 'services', 'ShippingService', 'commands', 'CancelShipment');

    await mkdir(messageDir, { recursive: true });
    await writeFile(path.join(messageDir, 'schema.json'), '{"type":"object"}');
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: CancelShipment
name: Cancel shipment
version: 0.0.1
schemaPath: schema.json
---
`
    );

    const schemas = await loadMessageSchemas({
      base: catalogDir,
      pattern: ['**/commands/*/index.{md,mdx}'],
    });

    expect(schemas).toHaveLength(1);
    expect(schemas[0]).toMatchObject({
      id: 'schema:commands:CancelShipment:0.0.1:schema.json',
      message: {
        collection: 'commands',
        id: 'CancelShipment',
        name: 'Cancel shipment',
        version: '0.0.1',
      },
      file: 'schema.json',
      format: 'jsonschema',
      latest: true,
    });
  });

  it('does not load schema entries when the referenced schema file is missing', async () => {
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'events', 'OrderPlaced');

    await mkdir(messageDir, { recursive: true });
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.0.0
schemaPath: missing-schema.json
---
`
    );

    const schemas = await loadMessageSchemas({
      base: catalogDir,
      pattern: ['**/events/*/index.{md,mdx}'],
    });

    expect(schemas).toEqual([]);
  });

  it('loads relative file schema refs without a configured schema source', async () => {
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'events', 'OrderPlaced');
    const schemaDir = path.join(messageDir, 'schemas');

    await mkdir(schemaDir, { recursive: true });
    await writeFile(path.join(schemaDir, 'OrderPlaced.schema.json'), '{"type":"object"}');
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.0.0
schemas:
  - ref: file://./schemas/OrderPlaced.schema.json
---
`
    );

    const schemas = await loadMessageSchemas({
      base: catalogDir,
      pattern: ['**/events/*/index.{md,mdx}'],
    });

    expect(schemas).toHaveLength(1);
    expect(schemas[0]).toMatchObject({
      id: 'file://./schemas/OrderPlaced.schema.json',
      ref: 'file://./schemas/OrderPlaced.schema.json',
      name: 'OrderPlaced.schema.json',
      format: 'jsonschema',
      filePath: path.join(schemaDir, 'OrderPlaced.schema.json'),
      latest: true,
      source: {
        provider: 'file',
        path: './schemas/OrderPlaced.schema.json',
      },
    });
  });

  it('loads absolute file schema refs without a configured schema source', async () => {
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const externalSchemaDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-registry-'));
    const messageDir = path.join(catalogDir, 'events', 'OrderPlaced');
    const schemaPath = path.join(externalSchemaDir, 'OrderPlaced.avsc');
    const schemaRef = pathToFileURL(schemaPath).toString();

    await mkdir(messageDir, { recursive: true });
    await writeFile(schemaPath, '{"type":"record"}');
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.0.0
schemas:
  - ref: ${schemaRef}
---
`
    );

    const schemas = await loadMessageSchemas({
      base: catalogDir,
      pattern: ['**/events/*/index.{md,mdx}'],
    });

    expect(schemas).toHaveLength(1);
    expect(schemas[0]).toMatchObject({
      id: schemaRef,
      ref: schemaRef,
      name: 'OrderPlaced.avsc',
      format: 'avro',
      filePath: schemaPath,
      latest: true,
      source: {
        provider: 'file',
        path: schemaPath,
      },
    });
  });

  it('requires EventCatalog Scale when schema sources are configured', async () => {
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'events', 'OrderPlaced');

    await mkdir(messageDir, { recursive: true });
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.0.0
schemas:
  - ref: git://contracts/events/OrderPlaced.schema.json
---
`
    );

    await expect(
      loadMessageSchemas(
        {
          base: catalogDir,
          pattern: ['**/events/*/index.{md,mdx}'],
        },
        [
          {
            type: 'schemas',
            name: 'contracts',
            canResolve: (id) => id.startsWith('git://contracts/'),
            resolve: async (id) => ({
              id,
              content: '{}',
              source: {
                provider: 'git',
              },
            }),
          },
        ]
      )
    ).rejects.toThrow('Schema sources require EventCatalog Scale.');
  });

  it('loads external schema entries from configured schema sources', async () => {
    process.env.EVENTCATALOG_SCALE = 'true';
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'events', 'OrderPlaced');

    await mkdir(messageDir, { recursive: true });
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.0.0
schemas:
  - ref: git://contracts/events/OrderPlaced.schema.json
    default: true
---
`
    );

    const schemas = await loadMessageSchemas(
      {
        base: catalogDir,
        pattern: ['**/events/*/index.{md,mdx}'],
      },
      [
        {
          type: 'schemas',
          name: 'contracts',
          canResolve: (id) => id.startsWith('git://contracts/'),
          resolve: async (id) => ({
            id,
            name: 'OrderPlaced.schema.json',
            format: 'jsonschema',
            content: '{"type":"object"}',
            source: {
              provider: 'git',
              id: 'contracts:events/OrderPlaced.schema.json',
              url: 'https://github.com/acme/schema-contracts.git',
              ref: 'main',
              path: 'schemas/events/OrderPlaced.schema.json',
            },
          }),
        },
      ]
    );

    expect(schemas).toHaveLength(1);
    expect(schemas[0]).toMatchObject({
      id: 'git://contracts/events/OrderPlaced.schema.json',
      name: 'OrderPlaced.schema.json',
      format: 'jsonschema',
      content: '{"type":"object"}',
      default: true,
      latest: true,
      readOnly: true,
      message: {
        collection: 'events',
        id: 'OrderPlaced',
        version: '1.0.0',
      },
      source: {
        provider: 'git',
        id: 'contracts:events/OrderPlaced.schema.json',
        url: 'https://github.com/acme/schema-contracts.git',
        ref: 'main',
        path: 'schemas/events/OrderPlaced.schema.json',
      },
    });
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Loading 1 schema from schema source "contracts"'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Synced 1 schema from schema source "contracts"'));
    consoleLog.mockRestore();
  });

  it('passes the referencing message file path to configured schema sources', async () => {
    process.env.EVENTCATALOG_SCALE = 'true';
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'events', 'OrderPlaced');
    const messageFilePath = path.join(messageDir, 'index.mdx');
    const resolve = vi.fn(async (id: string) => ({
      id,
      content: '{}',
      source: {
        provider: 'git',
      },
    }));

    await mkdir(messageDir, { recursive: true });
    await writeFile(
      messageFilePath,
      `---
id: OrderPlaced
name: Order placed
version: 1.0.0
schemas:
  - ref: git://contracts/events/OrderPlaced.schema.json
---
`
    );

    const schemas = await loadMessageSchemas(
      {
        base: catalogDir,
        pattern: ['**/events/*/index.{md,mdx}'],
      },
      [
        {
          type: 'schemas',
          name: 'contracts',
          canResolve: (id) => id.startsWith('git://contracts/'),
          resolve,
        },
      ]
    );

    expect(resolve).toHaveBeenCalledWith('git://contracts/events/OrderPlaced.schema.json', { messageFilePath });
    expect(schemas[0]).not.toHaveProperty('_context');
    consoleLog.mockRestore();
  });

  it('reports the message that referenced an external schema when the source cannot resolve it', async () => {
    process.env.EVENTCATALOG_SCALE = 'true';
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const messageDir = path.join(catalogDir, 'events', 'DeliveryFailed');

    await mkdir(messageDir, { recursive: true });
    await writeFile(
      path.join(messageDir, 'index.mdx'),
      `---
id: DeliveryFailed
name: Delivery failed
version: 1.0.0
schemas:
  - ref: git://contracts/events/Missing.schema.json
---
`
    );

    try {
      await loadMessageSchemas(
        {
          base: catalogDir,
          pattern: ['**/events/*/index.{md,mdx}'],
        },
        [
          {
            type: 'schemas',
            name: 'contracts',
            canResolve: (id) => id.startsWith('git://contracts/'),
            resolve: async () => {
              throw new Error(
                'Git schema source "contracts" could not find schema file "schemas/events/Missing.schema.json" in "https://github.com/acme/schema-contracts.git" at ref "main".'
              );
            },
          },
        ]
      );
      throw new Error('Expected schema loading to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toContain('[schemas] Failed to resolve schema');
      expect(message).toContain('Message: event "DeliveryFailed" version "1.0.0"');
      expect(message).toContain('Schema:  git://contracts/events/Missing.schema.json');
      expect(message).toContain('Source:  contracts');
      expect(message).toContain('Reason:');
      expect(message).toContain(
        'Git schema source "contracts" could not find schema file "schemas/events/Missing.schema.json" in "https://github.com/acme/schema-contracts.git" at ref "main".'
      );
    } finally {
      consoleLog.mockRestore();
    }
  });

  it('marks schemas for the latest message version using semver ordering', async () => {
    const catalogDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-schema-loader-'));
    const eventDir = path.join(catalogDir, 'events', 'OrderPlaced');
    const versionedEventDir = path.join(eventDir, 'versioned', '1.10.0');

    await mkdir(eventDir, { recursive: true });
    await mkdir(versionedEventDir, { recursive: true });
    await writeFile(path.join(eventDir, 'schema.json'), '{"type":"object","version":"1.9.0"}');
    await writeFile(path.join(versionedEventDir, 'schema.json'), '{"type":"object","version":"1.10.0"}');
    await writeFile(
      path.join(eventDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.9.0
schemaPath: schema.json
---
`
    );
    await writeFile(
      path.join(versionedEventDir, 'index.mdx'),
      `---
id: OrderPlaced
name: Order placed
version: 1.10.0
schemaPath: schema.json
---
`
    );

    const schemas = await loadMessageSchemas({
      base: catalogDir,
      pattern: ['**/events/*/index.{md,mdx}', '**/events/*/versioned/*/index.{md,mdx}'],
    });

    expect(schemas).toHaveLength(2);
    expect(schemas.find((schema) => schema.message.version === '1.9.0')).toMatchObject({ latest: false });
    expect(schemas.find((schema) => schema.message.version === '1.10.0')).toMatchObject({ latest: true });
  });
});
