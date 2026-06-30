import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-systems');

const {
  writeDomain,
  getDomain,
  writeSystem,
  writeSystemToDomain,
  getSystem,
  getSystemByPath,
  getSystems,
  versionSystem,
  rmSystem,
  rmSystemById,
  addFileToSystem,
  addServiceToSystem,
  addFlowToSystem,
  addEntityToSystem,
  addContainerToSystem,
  addSystemToDomain,
  writeServiceToSystem,
  writeFlowToSystem,
  writeEntityToSystem,
  writeDataStoreToSystem,
  getService,
  getFlow,
  getEntity,
  getDataStore,
  systemHasVersion,
  isSystem,
  toSystem,
  dumpCatalog,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Systems SDK', () => {
  describe('getSystem', () => {
    it('returns the given system id from EventCatalog and the latest version when no version is given', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        summary: 'Orchestrates payment processing',
        scope: 'internal',
        markdown: '# Payment Processing System',
        services: [{ id: 'payment-api', version: '1.0.0' }],
        containers: [{ id: 'payment-db', version: '1.0.0' }],
        relationships: [{ id: 'stripe', version: '1.0.0', label: 'requests charges from' }],
        actors: [{ id: 'buyer', name: 'Buyer', label: 'starts checkout' }],
      });

      const system = await getSystem('payment-processing-system');

      expect(system).toEqual({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        summary: 'Orchestrates payment processing',
        scope: 'internal',
        markdown: '# Payment Processing System',
        services: [{ id: 'payment-api', version: '1.0.0' }],
        containers: [{ id: 'payment-db', version: '1.0.0' }],
        relationships: [{ id: 'stripe', version: '1.0.0', label: 'requests charges from' }],
        actors: [{ id: 'buyer', name: 'Buyer', label: 'starts checkout' }],
      });
    });

    it('returns the requested system version when a version is given', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# v1',
      });

      await versionSystem('payment-processing-system');

      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '2.0.0',
        markdown: '# v2',
      });

      const system = await getSystem('payment-processing-system', '1.0.0');

      expect(system).toEqual({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# v1',
      });
    });

    it('returns undefined when the system is not found', async () => {
      await expect(await getSystem('missing-system')).toEqual(undefined);
    });
  });

  describe('getSystemByPath', () => {
    it('returns the given system from EventCatalog by its path', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      const system = await getSystemByPath(path.join(CATALOG_PATH, 'systems/payment-processing-system/index.mdx'));

      expect(system).toEqual({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });
    });
  });

  describe('getSystems', () => {
    it('returns all systems and ignores nested resources inside systems', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      await writeServiceToSystem(
        {
          id: 'payment-api',
          name: 'Payment API',
          version: '1.0.0',
          markdown: '# Payment API',
        },
        { id: 'payment-processing-system' }
      );

      const systems = await getSystems();

      expect(systems).toEqual([
        {
          id: 'payment-processing-system',
          name: 'Payment Processing System',
          version: '1.0.0',
          markdown: '# Payment Processing System',
        },
      ]);
    });

    it('returns only latest systems when latestOnly is true', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# v1',
      });

      await versionSystem('payment-processing-system');

      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '2.0.0',
        markdown: '# v2',
      });

      const systems = await getSystems({ latestOnly: true });

      expect(systems).toEqual([
        {
          id: 'payment-processing-system',
          name: 'Payment Processing System',
          version: '2.0.0',
          markdown: '# v2',
        },
      ]);
    });
  });

  describe('writeSystemToDomain', () => {
    it('writes the given system to a domain and can add the system to the domain frontmatter', async () => {
      await writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });

      await writeSystemToDomain(
        {
          id: 'payment-processing-system',
          name: 'Payment Processing System',
          version: '1.0.0',
          markdown: '# Payment Processing System',
        },
        { id: 'payments' }
      );

      await addSystemToDomain('payments', { id: 'payment-processing-system', version: '1.0.0' });

      const systemPath = path.join(CATALOG_PATH, 'domains/payments/systems/payment-processing-system/index.mdx');
      const system = await getSystem('payment-processing-system');
      const domain = await getDomain('payments');

      expect(fs.existsSync(systemPath)).toBe(true);
      expect(system).toEqual({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });
      expect(domain.systems).toEqual([{ id: 'payment-processing-system', version: '1.0.0' }]);
    });
  });

  describe('system resources', () => {
    it('writes resources inside a system and adds them to the system frontmatter', async () => {
      await writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });

      await writeSystemToDomain(
        {
          id: 'payment-processing-system',
          name: 'Payment Processing System',
          version: '1.0.0',
          markdown: '# Payment Processing System',
        },
        { id: 'payments' }
      );

      await writeServiceToSystem(
        {
          id: 'payment-api',
          name: 'Payment API',
          version: '1.0.0',
          markdown: '# Payment API',
        },
        { id: 'payment-processing-system' }
      );
      await writeFlowToSystem(
        {
          id: 'payment-flow',
          name: 'Payment Flow',
          version: '1.0.0',
          steps: [],
          markdown: '# Payment Flow',
        },
        { id: 'payment-processing-system' }
      );
      await writeEntityToSystem(
        {
          id: 'payment',
          name: 'Payment',
          version: '1.0.0',
          markdown: '# Payment',
        },
        { id: 'payment-processing-system' }
      );
      await writeDataStoreToSystem(
        {
          id: 'payment-db',
          name: 'Payment DB',
          version: '1.0.0',
          container_type: 'database',
          markdown: '# Payment DB',
        },
        { id: 'payment-processing-system' }
      );

      await addServiceToSystem('payment-processing-system', { id: 'payment-api', version: '1.0.0' });
      await addServiceToSystem('payment-processing-system', { id: 'payment-api', version: '1.0.0' });
      await addFlowToSystem('payment-processing-system', { id: 'payment-flow', version: '1.0.0' });
      await addEntityToSystem('payment-processing-system', { id: 'payment', version: '1.0.0' });
      await addContainerToSystem('payment-processing-system', { id: 'payment-db', version: '1.0.0' });

      const system = await getSystem('payment-processing-system');

      expect(await getService('payment-api')).toEqual({
        id: 'payment-api',
        name: 'Payment API',
        version: '1.0.0',
        markdown: '# Payment API',
      });
      expect(await getFlow('payment-flow')).toEqual({
        id: 'payment-flow',
        name: 'Payment Flow',
        version: '1.0.0',
        steps: [],
        markdown: '# Payment Flow',
      });
      expect(await getEntity('payment')).toEqual({
        id: 'payment',
        name: 'Payment',
        version: '1.0.0',
        markdown: '# Payment',
      });
      expect(await getDataStore('payment-db')).toEqual({
        id: 'payment-db',
        name: 'Payment DB',
        version: '1.0.0',
        container_type: 'database',
        markdown: '# Payment DB',
      });
      expect(system.services).toEqual([{ id: 'payment-api', version: '1.0.0' }]);
      expect(system.flows).toEqual([{ id: 'payment-flow', version: '1.0.0' }]);
      expect(system.entities).toEqual([{ id: 'payment', version: '1.0.0' }]);
      expect(system.containers).toEqual([{ id: 'payment-db', version: '1.0.0' }]);
    });
  });

  describe('addFileToSystem', () => {
    it('adds a file to the given system', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      await addFileToSystem('payment-processing-system', { content: '{"enabled":true}', fileName: 'metadata.json' });

      expect(fs.readFileSync(path.join(CATALOG_PATH, 'systems/payment-processing-system/metadata.json'), 'utf-8')).toBe(
        '{\n  "enabled": true\n}'
      );
    });
  });

  describe('rmSystem', () => {
    it('removes a system by path', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      await rmSystem('/payment-processing-system');

      expect(await getSystem('payment-processing-system')).toEqual(undefined);
    });
  });

  describe('rmSystemById', () => {
    it('removes a system by id', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      await rmSystemById('payment-processing-system');

      expect(await getSystem('payment-processing-system')).toEqual(undefined);
    });
  });

  describe('systemHasVersion', () => {
    it('returns true when the system version exists', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      expect(await systemHasVersion('payment-processing-system', '1.0.0')).toBe(true);
      expect(await systemHasVersion('payment-processing-system', '2.0.0')).toBe(false);
    });
  });

  describe('isSystem', () => {
    it('returns true when the path is a system', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      expect(await isSystem(path.join(CATALOG_PATH, 'systems/payment-processing-system/index.mdx'))).toBe(true);
    });
  });

  describe('toSystem', () => {
    it('converts raw file contents to a system', async () => {
      const system = await toSystem(`---
id: payment-processing-system
name: Payment Processing System
version: 1.0.0
---

# Payment Processing System
`);

      expect(system).toEqual({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });
    });
  });

  describe('dumpCatalog', () => {
    it('includes systems in the catalog dump', async () => {
      await writeSystem({
        id: 'payment-processing-system',
        name: 'Payment Processing System',
        version: '1.0.0',
        markdown: '# Payment Processing System',
      });

      const dump = await dumpCatalog();

      expect(dump.resources.systems).toEqual([
        expect.objectContaining({
          id: 'payment-processing-system',
          name: 'Payment Processing System',
          version: '1.0.0',
          markdown: '# Payment Processing System',
        }),
      ]);
    });
  });
});
