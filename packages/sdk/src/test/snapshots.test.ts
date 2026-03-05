import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-snapshots');

const { writeService, writeEvent, versionEvent, createSnapshot, diffSnapshots, listSnapshots } = utils(CATALOG_PATH);

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
