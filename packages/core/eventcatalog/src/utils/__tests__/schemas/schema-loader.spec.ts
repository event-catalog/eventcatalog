import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getMessageSchemasFromFrontmatter, loadMessageSchemas } from '@utils/collections/schema-loader';

describe('schema-loader', () => {
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

  it('does not create local schema resources for external schema references', () => {
    const schemas = getMessageSchemasFromFrontmatter({
      collection: 'events',
      messageFilePath: '/catalog/events/ShipmentCancelled/index.mdx',
      data: {
        id: 'ShipmentCancelled',
        version: '1.0.0',
        schemas: [{ id: 'schema-from-confluent', environments: ['prod'] }],
      },
    });

    expect(schemas).toEqual([]);
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
