import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-file-cache');

const {
  writeEvent,
  writeService,
  writeDomain,
  getEvent,
  getEvents,
  getService,
  getDomain,
  rmEvent,
  rmEventById,
  versionEvent,
  addEventToService,
  addServiceToDomain,
  addSchemaToEvent,
} = utils(CATALOG_PATH);

const writeByHand = (file: string, id: string, version = '1.0.0') => {
  const fullPath = path.join(CATALOG_PATH, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `---\nid: ${id}\nname: ${id}\nversion: ${version}\n---\n`);
};

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('file cache', () => {
  describe('resources it returns are copies', () => {
    it('changing a resource it returned does not change the next one it returns', async () => {
      await writeService({ id: 'Orders', name: 'Orders', version: '1.0.0', markdown: '', sends: [{ id: 'Placed' }] });

      const service = await getService('Orders');
      service.sends!.push({ id: 'Changed' });
      service.name = 'Changed';

      const again = await getService('Orders');
      expect(again.sends).toEqual([{ id: 'Placed' }]);
      expect(again.name).toBe('Orders');
    });

    it('attaching a schema does not attach it to resources read without one', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '', schemaPath: 'schema.json' });
      await addSchemaToEvent('Placed', { schema: '{"type":"object"}', fileName: 'schema.json' });

      expect((await getEvent('Placed', undefined, { attachSchema: true })).schema).toEqual({ type: 'object' });
      expect((await getEvent('Placed')).schema).toBeUndefined();
      expect((await getEvents({ attachSchema: true }))[0].schema).toEqual({ type: 'object' });
      expect((await getEvents())[0].schema).toBeUndefined();
    });
  });

  describe('changes made outside the SDK', () => {
    it('finds a resource added by hand next to resources it already knows', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect(await getEvent('Placed')).toBeDefined();

      writeByHand('events/Shipped/index.mdx', 'Shipped');

      expect(await getEvent('Shipped')).toMatchObject({ id: 'Shipped' });
    });

    it('finds a resource added by hand in a new top-level folder', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect(await getEvent('Placed')).toBeDefined();

      writeByHand('domains/Orders/index.mdx', 'Orders');

      expect(await getDomain('Orders')).toMatchObject({ id: 'Orders' });
    });

    it('forgets a resource removed by hand', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'Shipped', name: 'Shipped', version: '1.0.0', markdown: '' });
      expect(await getEvent('Shipped')).toBeDefined();

      fs.rmSync(path.join(CATALOG_PATH, 'events', 'Shipped'), { recursive: true });

      expect(await getEvent('Shipped')).toBeUndefined();
      expect(await getEvent('Placed')).toBeDefined();
    });

    it('starts again when the catalog is removed and made again', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect(await getEvent('Placed')).toBeDefined();

      fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
      writeByHand('events/Shipped/index.mdx', 'Shipped');

      expect(await getEvent('Placed')).toBeUndefined();
      expect(await getEvent('Shipped')).toBeDefined();
    });

    it('finds a resource added by hand deep inside a resource it already knows', async () => {
      await writeDomain({ id: 'Sales', name: 'Sales', version: '0.0.1', markdown: '' });
      expect(await getDomain('Sales')).toBeDefined();

      writeByHand('domains/Sales/systems/orders-system/services/Orders/index.mdx', 'Orders');

      expect(await getService('Orders')).toMatchObject({ id: 'Orders' });
    });

    it('reads a resource again when its file was changed by hand', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect((await getEvent('Placed')).name).toBe('Placed');

      const file = path.join(CATALOG_PATH, 'events', 'Placed', 'index.mdx');
      fs.writeFileSync(file, '---\nid: Placed\nname: Changed by hand\nversion: 1.0.0\n---\n');
      // Make sure the mtime moves, however coarse the file system's clock is
      fs.utimesSync(file, new Date(), new Date(Date.now() + 5000));

      expect((await getEvent('Placed')).name).toBe('Changed by hand');
      expect((await getEvents())[0].name).toBe('Changed by hand');
    });

    it('removes every file with the id, including one whose id was changed to it by hand', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'Shipped', name: 'Shipped', version: '1.0.0', markdown: '' });
      expect(await getEvent('Shipped')).toBeDefined();

      // Changed in place, so no folder's mtime moves
      const file = path.join(CATALOG_PATH, 'events', 'Shipped', 'index.mdx');
      fs.writeFileSync(file, '---\nid: Placed\nname: Placed\nversion: 1.0.0\n---\n');
      fs.utimesSync(file, new Date(), new Date(Date.now() + 5000));

      await rmEventById('Placed');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events', 'Placed'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'events', 'Shipped'))).toBe(false);
    });

    it('finds a resource made again by hand after the SDK removed it', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect(await getEvent('Placed')).toBeDefined();

      // Made again before anything else is looked up
      await rmEvent('/Placed');
      writeByHand('events/Placed/index.mdx', 'Placed');

      expect(await getEvent('Placed')).toMatchObject({ id: 'Placed' });
    });

    it('writes a resource again after its folder was removed by hand', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect(await getEvent('Placed')).toBeDefined();

      fs.rmSync(path.join(CATALOG_PATH, 'events', 'Placed'), { recursive: true });

      // Would throw "version already exists" if the cache still had the removed file
      await writeEvent({ id: 'Placed', name: 'Placed again', version: '1.0.0', markdown: '' });
      expect((await getEvent('Placed')).name).toBe('Placed again');
    });

    it('removes a resource by id that it has not seen, by reading the files', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      expect(await getEvent('Placed')).toBeDefined();

      // Nested inside a folder it already knows, so the cache doesn't notice it
      writeByHand('events/Placed/events/Hidden/index.mdx', 'Hidden');

      await rmEventById('Hidden');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events', 'Placed', 'events', 'Hidden'))).toBe(false);
    });
  });

  describe('changes made through the SDK', () => {
    it('keeps every version findable after versioning and removing', async () => {
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'Placed', name: 'Placed', version: '2.0.0', markdown: '' }, { versionExistingContent: true });
      await writeEvent({ id: 'Shipped', name: 'Shipped', version: '1.0.0', markdown: '' });

      expect((await getEvent('Placed')).version).toBe('2.0.0');
      expect((await getEvent('Placed', '1.0.0')).version).toBe('1.0.0');

      await versionEvent('Placed');
      expect(await getEvent('Placed')).toBeUndefined();
      expect((await getEvent('Placed', '2.0.0')).version).toBe('2.0.0');

      await rmEventById('Placed', '1.0.0');
      expect(await getEvent('Placed', '1.0.0')).toBeUndefined();
      expect((await getEvent('Placed', '2.0.0')).version).toBe('2.0.0');
      expect(await getEvent('Shipped')).toBeDefined();
    });

    it('finds the file written last when two files have the same id and version', async () => {
      await writeEvent({ id: 'Placed', name: 'First', version: '1.0.0', markdown: '' });
      expect((await getEvent('Placed')).name).toBe('First');

      await writeService({ id: 'Orders', name: 'Orders', version: '1.0.0', markdown: '' });
      await writeEvent(
        { id: 'Placed', name: 'Second', version: '1.0.0', markdown: '' },
        { path: '../services/Orders/events/Placed', override: true }
      );

      expect((await getEvent('Placed')).name).toBe('Second');
      expect((await getEvent('Placed', '1.0.0')).name).toBe('Second');
    });

    it('sees changes made through functions scoped to a collection folder from the whole catalog', async () => {
      await writeDomain({ id: 'Orders', name: 'Orders', version: '1.0.0', markdown: '' });
      await writeService({ id: 'Checkout', name: 'Checkout', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'Placed', name: 'Placed', version: '1.0.0', markdown: '' });

      await addEventToService('Checkout', 'sends', { id: 'Placed', version: '1.0.0' });
      await addServiceToDomain('Orders', { id: 'Checkout', version: '1.0.0' });

      expect((await getService('Checkout')).sends).toEqual([{ id: 'Placed', version: '1.0.0' }]);
      expect((await getDomain('Orders')).services).toEqual([{ id: 'Checkout', version: '1.0.0' }]);
      expect((await getEvents()).map((e) => e.id)).toEqual(['Placed']);
    });
  });
});
