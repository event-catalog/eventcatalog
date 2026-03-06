import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-snapshots');

const {
  writeService,
  writeEvent,
  writeCommand,
  writeQuery,
  versionEvent,
  addSchemaToEvent,
  createSnapshot,
  diffSnapshots,
  listSnapshots,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Snapshots SDK', () => {
  describe('createSnapshot', () => {
    it('creates a snapshot file containing all catalog resources', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '# OrderCreated' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const result = await createSnapshot({ outputDir: path.join(CATALOG_PATH, '.snapshots') });

      expect(result.filePath).toContain('.snapshot.json');
      expect(result.snapshot.snapshotVersion).toBe('1.0.0');
      expect(result.snapshot.resources.services).toHaveLength(1);
      expect(result.snapshot.resources.services[0].id).toBe('OrdersService');
      expect(result.snapshot.resources.messages.events).toHaveLength(1);
      expect(result.snapshot.resources.messages.events[0].id).toBe('OrderCreated');
    });

    it('only includes core fields (id, version, name, sends, receives, deprecated)', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Some summary',
        markdown: '# Some markdown content',
      });

      const result = await createSnapshot({ outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const event = result.snapshot.resources.messages.events[0];

      expect(event.id).toBe('OrderCreated');
      expect(event.version).toBe('1.0.0');
      expect(event.name).toBe('Order Created');
      expect(event.markdown).toBeUndefined();
      expect(event.summary).toBeUndefined();
    });

    it('creates a snapshot with a custom label', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      const result = await createSnapshot({ label: 'pre-release', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      expect(result.snapshot.label).toBe('pre-release');
      expect(result.filePath).toContain('pre-release');
    });

    it('when an event has a schemaPath and schema file, createSnapshot includes a schemaHash for that event', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        schemaPath: 'schema.json',
        markdown: '',
      });
      await addSchemaToEvent('OrderCreated', {
        schema: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } }),
        fileName: 'schema.json',
      });

      const result = await createSnapshot({ outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const event = result.snapshot.resources.messages.events[0];

      expect(event.schemaHash).toBeDefined();
      expect(typeof event.schemaHash).toBe('string');
      expect(event.schemaHash.length).toBe(64); // SHA-256 hex digest
    });

    it('when an event has no schemaPath, createSnapshot does not include a schemaHash for that event', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      const result = await createSnapshot({ outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const event = result.snapshot.resources.messages.events[0];

      expect(event.schemaHash).toBeUndefined();
    });

    it('when schema file content changes, createSnapshot produces a different schemaHash', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        schemaPath: 'schema.json',
        markdown: '',
      });
      await addSchemaToEvent('OrderCreated', {
        schema: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } }),
        fileName: 'schema.json',
      });

      const result1 = await createSnapshot({ label: 'snap1', outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const hash1 = result1.snapshot.resources.messages.events[0].schemaHash;

      // Change the schema content
      await addSchemaToEvent('OrderCreated', {
        schema: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' }, amount: { type: 'number' } } }),
        fileName: 'schema.json',
      });

      const result2 = await createSnapshot({ label: 'snap2', outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const hash2 = result2.snapshot.resources.messages.events[0].schemaHash;

      expect(hash1).not.toBe(hash2);
    });

    it('when commands and queries have schema files, createSnapshot includes schemaHash values for them too', async () => {
      await writeCommand({
        id: 'ProcessPayment',
        name: 'Process Payment',
        version: '1.0.0',
        schemaPath: 'schema.json',
        markdown: '',
      });
      // Write schema file directly for the command
      const commandSchemaPath = path.join(CATALOG_PATH, 'commands', 'ProcessPayment', 'schema.json');
      fs.writeFileSync(commandSchemaPath, JSON.stringify({ type: 'object' }));

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '1.0.0',
        schemaPath: 'schema.json',
        markdown: '',
      });
      const querySchemaPath = path.join(CATALOG_PATH, 'queries', 'GetOrder', 'schema.json');
      fs.writeFileSync(querySchemaPath, JSON.stringify({ type: 'object', properties: { id: { type: 'string' } } }));

      const result = await createSnapshot({ outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const command = result.snapshot.resources.messages.commands[0];
      const query = result.snapshot.resources.messages.queries[0];

      expect(command.schemaHash).toBeDefined();
      expect(command.schemaHash.length).toBe(64);
      expect(query.schemaHash).toBeDefined();
      expect(query.schemaHash.length).toBe(64);
    });

    it('writes the snapshot file to disk', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      const result = await createSnapshot({ outputDir: path.join(CATALOG_PATH, '.snapshots') });

      expect(fs.existsSync(result.filePath)).toBe(true);
      const fileContent = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'));
      expect(fileContent.snapshotVersion).toBe('1.0.0');
    });
  });

  describe('diffSnapshots', () => {
    it('detects when a new consumer is added to an event', async () => {
      // Snapshot A: OrdersService sends OrderCreated, no consumers
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Add a consumer: PaymentService now receives OrderCreated
      await writeService({
        id: 'PaymentService',
        name: 'Payment Service',
        version: '1.0.0',
        markdown: '',
        receives: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      // PaymentService was added as a new resource
      const addedService = diff.resources.find((r) => r.resourceId === 'PaymentService');
      expect(addedService).toBeDefined();
      expect(addedService!.changeType).toBe('added');

      // A new relationship: PaymentService receives OrderCreated
      const addedRelationship = diff.relationships.find(
        (r) => r.serviceId === 'PaymentService' && r.resourceId === 'OrderCreated'
      );
      expect(addedRelationship).toBeDefined();
      expect(addedRelationship!.changeType).toBe('added');
      expect(addedRelationship!.direction).toBe('receives');
    });

    it('detects when a resource is removed', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'LegacyEvent', name: 'Legacy Event', version: '0.9.0', markdown: '' });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Remove LegacyEvent
      fs.rmSync(path.join(CATALOG_PATH, 'events', 'LegacyEvent'), { recursive: true, force: true });

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      const removed = diff.resources.find((r) => r.resourceId === 'LegacyEvent');
      expect(removed).toBeDefined();
      expect(removed!.changeType).toBe('removed');
      expect(diff.summary.resourcesRemoved).toBe(1);
    });

    it('detects when a resource is modified (e.g. name changed)', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Modify the event name
      await writeEvent(
        {
          id: 'OrderCreated',
          name: 'Order Created Event',
          version: '1.0.0',
          markdown: '',
        },
        { override: true }
      );

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      const modified = diff.resources.find((r) => r.resourceId === 'OrderCreated');
      expect(modified).toBeDefined();
      expect(modified!.changeType).toBe('modified');
      expect(modified!.changedFields).toContain('name');
      expect(diff.summary.resourcesModified).toBe(1);
    });

    it('detects when a resource is versioned (same id, different version)', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Version bump: version the existing event, then write new version
      await versionEvent('OrderCreated');
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '2.0.0', markdown: '' });

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      const versioned = diff.resources.find((r) => r.resourceId === 'OrderCreated' && r.changeType === 'versioned');
      expect(versioned).toBeDefined();
      expect(versioned!.previousVersion).toBe('1.0.0');
      expect(versioned!.newVersion).toBe('2.0.0');
      expect(diff.summary.resourcesVersioned).toBe(1);
    });

    it('returns zero changes when comparing identical snapshots', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const snapshotA = await createSnapshot({ label: 'snapshot-a', outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const snapshotB = await createSnapshot({ label: 'snapshot-b', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      expect(diff.summary.totalChanges).toBe(0);
      expect(diff.resources).toHaveLength(0);
      expect(diff.relationships).toHaveLength(0);
    });

    it('detects when a service adds a new sends relationship', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'OrderUpdated', name: 'Order Updated', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // OrdersService now also sends OrderUpdated
      await writeService(
        {
          id: 'OrdersService',
          name: 'Orders Service',
          version: '1.0.0',
          markdown: '',
          sends: [
            { id: 'OrderCreated', version: '1.0.0' },
            { id: 'OrderUpdated', version: '1.0.0' },
          ],
        },
        { override: true }
      );

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      const addedRel = diff.relationships.find(
        (r) => r.serviceId === 'OrdersService' && r.resourceId === 'OrderUpdated' && r.direction === 'sends'
      );
      expect(addedRel).toBeDefined();
      expect(addedRel!.changeType).toBe('added');
      expect(diff.summary.relationshipsAdded).toBe(1);
    });

    it('does not emit false relationship changes when a service version is bumped without changing relationships', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Bump service version without changing relationships
      await writeService(
        {
          id: 'OrdersService',
          name: 'Orders Service',
          version: '2.0.0',
          markdown: '',
          sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        },
        { override: true }
      );

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      // Service was versioned, but no relationship changes
      expect(diff.relationships).toHaveLength(0);
      expect(diff.summary.relationshipsAdded).toBe(0);
      expect(diff.summary.relationshipsRemoved).toBe(0);
    });

    it('detects relationship changes when a service version bump also adds new relationships', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'OrderUpdated', name: 'Order Updated', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Bump version AND add a new sends relationship
      await writeService(
        {
          id: 'OrdersService',
          name: 'Orders Service',
          version: '2.0.0',
          markdown: '',
          sends: [
            { id: 'OrderCreated', version: '1.0.0' },
            { id: 'OrderUpdated', version: '1.0.0' },
          ],
        },
        { override: true }
      );

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      // Only the new relationship should appear, not the existing one
      expect(diff.relationships).toHaveLength(1);
      const addedRel = diff.relationships[0];
      expect(addedRel.serviceId).toBe('OrdersService');
      expect(addedRel.resourceId).toBe('OrderUpdated');
      expect(addedRel.direction).toBe('sends');
      expect(addedRel.changeType).toBe('added');
    });

    it('detects relationship changes when a service version bump also removes relationships', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'OrderUpdated', name: 'Order Updated', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        markdown: '',
        sends: [
          { id: 'OrderCreated', version: '1.0.0' },
          { id: 'OrderUpdated', version: '1.0.0' },
        ],
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Bump version AND remove OrderUpdated
      await writeService(
        {
          id: 'OrdersService',
          name: 'Orders Service',
          version: '2.0.0',
          markdown: '',
          sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        },
        { override: true }
      );

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      // Only the removed relationship should appear
      expect(diff.relationships).toHaveLength(1);
      const removedRel = diff.relationships[0];
      expect(removedRel.serviceId).toBe('OrdersService');
      expect(removedRel.resourceId).toBe('OrderUpdated');
      expect(removedRel.direction).toBe('sends');
      expect(removedRel.changeType).toBe('removed');
    });

    it('when a message schema file changes between snapshots, diffSnapshots reports schemaHash as a changed field', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        schemaPath: 'schema.json',
        markdown: '',
      });
      await addSchemaToEvent('OrderCreated', {
        schema: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } }),
        fileName: 'schema.json',
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // Change the schema content
      await addSchemaToEvent('OrderCreated', {
        schema: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' }, amount: { type: 'number' } } }),
        fileName: 'schema.json',
      });

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      const modified = diff.resources.find((r) => r.resourceId === 'OrderCreated');
      expect(modified).toBeDefined();
      expect(modified!.changeType).toBe('modified');
      expect(modified!.changedFields).toContain('schemaHash');
    });

    it('when schema content is identical between snapshots, diffSnapshots does not report a schema change', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        schemaPath: 'schema.json',
        markdown: '',
      });
      await addSchemaToEvent('OrderCreated', {
        schema: JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } }),
        fileName: 'schema.json',
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });
      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      expect(diff.summary.totalChanges).toBe(0);
      expect(diff.resources).toHaveLength(0);
    });

    it('detects when a service removes a receives relationship', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'PaymentProcessed', name: 'Payment Processed', version: '1.0.0', markdown: '' });
      await writeService({
        id: 'PaymentService',
        name: 'Payment Service',
        version: '1.0.0',
        markdown: '',
        receives: [
          { id: 'OrderCreated', version: '1.0.0' },
          { id: 'PaymentProcessed', version: '1.0.0' },
        ],
      });

      const snapshotA = await createSnapshot({ label: 'before', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      // PaymentService no longer receives PaymentProcessed
      await writeService(
        {
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '',
          receives: [{ id: 'OrderCreated', version: '1.0.0' }],
        },
        { override: true }
      );

      const snapshotB = await createSnapshot({ label: 'after', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const diff = await diffSnapshots(snapshotA.filePath, snapshotB.filePath);

      const removedRel = diff.relationships.find(
        (r) => r.serviceId === 'PaymentService' && r.resourceId === 'PaymentProcessed' && r.direction === 'receives'
      );
      expect(removedRel).toBeDefined();
      expect(removedRel!.changeType).toBe('removed');
      expect(diff.summary.relationshipsRemoved).toBe(1);
    });
  });

  describe('listSnapshots', () => {
    it('returns metadata for all snapshots in the .snapshots directory', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      await createSnapshot({ label: 'v1', outputDir: path.join(CATALOG_PATH, '.snapshots') });
      await createSnapshot({ label: 'v2', outputDir: path.join(CATALOG_PATH, '.snapshots') });

      const snapshots = await listSnapshots();

      expect(snapshots).toHaveLength(2);
      expect(snapshots.map((s) => s.label)).toContain('v1');
      expect(snapshots.map((s) => s.label)).toContain('v2');
    });
  });
});
