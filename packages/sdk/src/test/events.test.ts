// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-events');

const {
  writeEvent,
  writeEventToService,
  getEvent,
  getEvents,
  rmEvent,
  rmEventById,
  versionEvent,
  addFileToEvent,
  addSchemaToEvent,
  eventHasVersion,
  writeServiceToDomain,
  writeService,
  versionService,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Events SDK', () => {
  describe('getEvent', () => {
    it('returns the given event id from EventCatalog and the latest version when no version is given,', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        draft: {
          title: 'Draft',
          message: 'This is a draft',
        },
        attachments: [
          {
            url: 'https://example.com',
            title: 'Example',
            type: 'example',
            description: 'This is an example',
            icon: 'example',
          },
        ],
        diagrams: [{ id: 'InventoryAdjustedDiagram', version: '1.0.0' }],
      });

      const test = await getEvent('InventoryAdjusted');

      expect(test).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        draft: {
          title: 'Draft',
          message: 'This is a draft',
        },
        attachments: [
          {
            url: 'https://example.com',
            title: 'Example',
            type: 'example',
            description: 'This is an example',
            icon: 'example',
          },
        ],
        diagrams: [{ id: 'InventoryAdjustedDiagram', version: '1.0.0' }],
      });
    });

    it('returns the given event id from EventCatalog and the latest version when no version is given and the event is inside a services folder,', async () => {
      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/InventoryService/InventoryAdjusted' }
      );

      const test = await getEvent('InventoryAdjusted');

      expect(test).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the given event id from EventCatalog and the requested version when a version is given,', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionEvent('InventoryAdjusted');

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '1.0.0',
        summary: 'This is version 1.0.0',
        markdown: '# Hello world',
      });

      const test = await getEvent('InventoryAdjusted', '0.0.1');

      expect(test).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the given event id from EventCatalog and the requested version when a version is given (non-semver),', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionEvent('InventoryAdjusted');

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '2',
        summary: 'This is version 1.0.0',
        markdown: '# Hello world',
      });

      const test = await getEvent('InventoryAdjusted', '1');

      expect(test).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the latest version of the event if the version matches the latest version', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const test = await getEvent('InventoryAdjusted', '0.0.1');

      expect(test).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the version of the event even if the event does not match semver matching', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '100',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const test = await getEvent('InventoryAdjusted', '100');

      expect(test).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '100',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the event with the schema attached when the attachSchema option is set to true', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        schemaPath: 'schema.json',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await addSchemaToEvent('InventoryAdjusted', file);

      const test = await getEvent('InventoryAdjusted', '0.0.1', { attachSchema: true });

      expect(test.schema).toEqual(schema);
    });

    it('does not attach the schema if the attachSchema option is not set', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await writeEvent({
        id: 'InventoryAdjusted2',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        schemaPath: 'schema.json',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addSchemaToEvent('InventoryAdjusted2', file);

      const test = await getEvent('InventoryAdjusted2', '0.0.1', { attachSchema: false });

      expect(test.schema).toEqual(undefined);
    });

    it('returns undefined when a given resource is not found', async () => {
      const event = await getEvent('InventoryAdjusted');
      await expect(event).toEqual(undefined);
    });

    it('throws an error if the event is  found but not the version', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await expect(await getEvent('InventoryAdjusted', '1.0.0')).toEqual(undefined);
    });

    describe('when events are within a service that is within a domain', async () => {
      it('returns the given event id from EventCatalog and the latest version when no version is given,', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getEvent('InventoryAdjusted');

        expect(test).toEqual({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the given event id from EventCatalog and the latest version when no version is given and the event is inside a services folder,', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getEvent('InventoryAdjusted');

        expect(test).toEqual({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the given event id from EventCatalog and the requested version when a version is given,', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        await versionEvent('InventoryAdjusted');

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getEvent('InventoryAdjusted', '0.0.1');

        expect(test).toEqual({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the latest version of the event if the version matches the latest version', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getEvent('InventoryAdjusted', '0.0.1');

        expect(test).toEqual({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the version of the event even if the event does not match semver matching', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '100',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '100',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getEvent('InventoryAdjusted', '100');

        expect(test).toEqual({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '100',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('writes the event to the correct folder path', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const files = await fs.readdirSync(
          path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService/events/InventoryAdjusted')
        );

        expect(files).toEqual(['index.mdx']);
      });
    });
  });

  describe('getEvents', () => {
    it('returns all the events in the catalog,', async () => {
      // versioned event
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest event
      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // event in the services folder
      await writeEvent(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      const events = await getEvents();

      expect(events).toEqual(
        expect.arrayContaining([
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'OrderComplete',
            name: 'Order Complete',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
        ])
      );
    });
    it('returns only the latest events when `latestOnly` is set to true,', async () => {
      // versioned event
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest event
      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // event in the services folder
      await writeEvent(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      // event in the services folder
      await writeEvent(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '2.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService', versionExistingContent: true }
      );

      const events = await getEvents({ latestOnly: true });

      expect(events).toEqual(
        expect.arrayContaining([
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'OrderComplete',
            name: 'Order Complete',
            version: '2.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
        ])
      );
    });
    it('returns the event with the schema attached when the attachSchema option is set to true', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        schemaPath: 'schema.json',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await addSchemaToEvent('InventoryAdjusted', file);

      const test = await getEvent('InventoryAdjusted', '0.0.1', { attachSchema: true });

      expect(test.schema).toEqual(schema);
    });
  });

  describe('writeEvent', () => {
    it('writes the given event to EventCatalog and assumes the path if one if not given', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        sidebar: {
          badge: 'badge',
        },
      });

      const event = await getEvent('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      expect(event).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        sidebar: {
          badge: 'badge',
        },
      });
    });

    it('writes the given event (as .md) to EventCatalog if the format is .md', async () => {
      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
          sidebar: {
            badge: 'badge',
          },
        },
        {
          format: 'md',
        }
      );

      const event = await getEvent('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.md'))).toBe(true);

      expect(event).toEqual({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        sidebar: {
          badge: 'badge',
        },
      });
    });

    it('when resourceGroups is given, it writes the event with the given resourceGroups', async () => {
      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
          resourceGroups: [
            {
              id: 'Inventory',
              items: [
                { id: 'InventoryAdjusted', version: '0.0.1', type: 'event' },
                { id: 'InventoryAdjusted', version: '0.0.2', type: 'event' },
              ],
              title: 'Related Resources',
              limit: 10,
              sidebar: true,
            },
          ],
        },
        { path: '/Inventory/InventoryAdjusted' }
      );
      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/Inventory/InventoryAdjusted', 'index.mdx'))).toBe(true);
    });

    it('writes the given event to EventCatalog under the correct path when a path is given', async () => {
      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/Inventory/InventoryAdjusted' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/Inventory/InventoryAdjusted', 'index.mdx'))).toBe(true);
    });

    it('throws an error when trying to write an event that already exists (and override is false, default)', async () => {
      const createEvent = async () =>
        writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

      await createEvent();

      await expect(
        writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        })
      ).rejects.toThrowError('Failed to write InventoryAdjusted (event) as the version 0.0.1 already exists');
    });

    it('overrides the event when trying to write an event that already exists and override is true', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeEvent(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Overridden content',
        },
        {
          override: true,
        }
      );

      const event = await getEvent('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);
      expect(event.markdown).toBe('Overridden content');
    });

    describe('versionExistingContent', () => {
      it('versions the previous event when trying to write an event that already exists and versionExistingEvent is true and the new version number is greater than the previous one', async () => {
        await writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Hello world',
        });

        await writeEvent(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: 'New Content!',
          },
          {
            versionExistingContent: true,
          }
        );

        const event = await getEvent('InventoryAdjusted', '1.0.0');
        expect(event.markdown).toBe('New Content!');
        expect(event.version).toBe('1.0.0');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.1', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);
      });

      it('does not version the previous event but overrides it when versionExistingContent is true and override is also true', async () => {
        await writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Hello world',
        });

        await writeEvent(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: 'New Content!',
          },
          {
            versionExistingContent: true,
            override: true,
          }
        );

        const event = await getEvent('InventoryAdjusted', '0.0.1');
        expect(event.markdown).toBe('New Content!');
        expect(event.version).toBe('0.0.1');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.1', 'index.mdx'))).toBe(false);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write an event and versionExistingEvent is true and the new version number is not greater than the previous one', async () => {
        await writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: 'Hello world',
        });

        await expect(
          writeEvent(
            {
              id: 'InventoryAdjusted',
              name: 'Inventory Adjusted',
              version: '0.0.1',
              summary: 'This is a summary',
              markdown: 'New Content!',
            },
            {
              versionExistingContent: true,
            }
          )
        ).rejects.toThrowError('New version 0.0.1 is not greater than current version 1.0.0');
      });
    });
  });

  describe('writeEventToService', () => {
    it('writes an event to the given service. When no version if given for the service the event is added to the latest service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeEventToService(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
        }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
        true
      );
    });
    it('writes an event to the given service. When a version is given for the service the event is added to that service version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
      await writeEventToService(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
          version: '1.0.0',
        }
      );
      expect(
        fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/1.0.0/events/InventoryAdjusted', 'index.mdx'))
      ).toBe(true);
    });
    it('writes an event to the given service. When a version is the latest the event is added to the latest version of the service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeEventToService(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
          version: 'latest',
        }
      );
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService//events/InventoryAdjusted', 'index.mdx'))).toBe(
        true
      );
    });

    it('when override is true, it overrides the event if it already exists', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // Write the first event
      await writeEventToService(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
        }
      );

      await writeEventToService(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Overridden content',
        },
        {
          id: 'InventoryService',
        },
        {
          override: true,
        }
      );

      const event = await getEvent('InventoryAdjusted', '0.0.1');

      expect(event.markdown).toBe('Overridden content');
    });
  });

  describe('rmEvent', () => {
    it('removes an event from eventcatalog', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      await rmEvent('/InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);
    });
  });

  describe('rmEventById', () => {
    it('removes an event from eventcatalog by id', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      await rmEventById('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);
    });

    it('removes and event and all files in that event', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      fs.writeFileSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'), 'SCHEMA!');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      await rmEventById('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'))).toBe(false);
    });

    it('removes and event but keeps its files when persistFiles is set to true', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      fs.writeFileSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'), 'SCHEMA!');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      await rmEventById('InventoryAdjusted', '0.0.1', true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'))).toBe(true);
    });

    it('removes an event from eventcatalog by id and version', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      await rmEventById('InventoryAdjusted', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);
    });

    it('if version is given, only removes that version and not any other versions of the event', async () => {
      // write the first events
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionEvent('InventoryAdjusted');

      // Write the versioned event
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.1', 'index.mdx'))).toBe(true);

      await rmEventById('InventoryAdjusted', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.2', 'index.mdx'))).toBe(false);
    });

    describe('when events are within a service directory', () => {
      it('removes an event from EventCatalog by id', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        // expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/events/InventoryAdjusted', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          true
        );
        await rmEventById('InventoryAdjusted');
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          false
        );
      });

      it('if version is given, only removes that version and not any other versions of the event', async () => {
        // write the first events
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            markdown: '# Hello world',
            version: '0.0.1',
          },
          {
            id: 'InventoryService',
          }
        );

        await versionEvent('InventoryAdjusted');

        // Write the versioned event
        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          true
        );
        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.1', 'index.mdx')
          )
        ).toBe(true);

        await rmEventById('InventoryAdjusted', '0.0.1');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          true
        );
        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.1', 'index.mdx')
          )
        ).toBe(false);
      });
    });
  });

  describe('versionEvent', () => {
    it('adds the given event to the versioned directory and removes itself from the root', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // // Add random file in there
      // await fs.writeFileSync(path.join(CATALOG_PATH, 'events/Inventory/InventoryAdjusted', 'schema.json'), 'SCHEMA!');

      await versionEvent('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.2', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);
    });
    it('adds the given event to the versioned directory and all files that are associated to it', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // Add random file in there
      await fs.writeFileSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'), 'SCHEMA!');

      await versionEvent('InventoryAdjusted');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.2', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.2', 'schema.json'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'index.mdx'))).toBe(false);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'))).toBe(false);
    });

    describe('when events are within a service directory', () => {
      it('adds the given event to the versioned directory and removes itself from the root', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await versionEvent('InventoryAdjusted');

        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.2', 'index.mdx')
          )
        ).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          false
        );
      });
      it('adds the given event to the versioned directory and all files that are associated to it', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        // Add random file in there
        await fs.writeFileSync(
          path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'schema.json'),
          'SCHEMA!'
        );

        await versionEvent('InventoryAdjusted');

        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.2', 'index.mdx')
          )
        ).toBe(true);

        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.2', 'schema.json')
          )
        ).toBe(true);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          false
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'schema.json'))).toBe(
          false
        );
      });

      it('when the service and the event is versioned, the event remains in the root of the service but versioned in its own directory', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        // Add a random file to the service and event
        await fs.writeFileSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'), 'SCHEMA!');
        await fs.writeFileSync(
          path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'schema.json'),
          'SCHEMA!'
        );

        await versionService('InventoryService');
        await versionEvent('InventoryAdjusted');

        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.2', 'index.mdx')
          )
        ).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'schema.json'))).toBe(true);
        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.2', 'schema.json')
          )
        ).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'index.mdx'))).toBe(
          false
        );
      });
    });
  });

  describe('addFileToEvent', () => {
    it('takes a given file and writes it to the location of the given event', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addFileToEvent('InventoryAdjusted', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'test.txt'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // version the event
      await versionEvent('InventoryAdjusted');

      await addFileToEvent('InventoryAdjusted', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('if the directory does not exist, it will be created', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await addFileToEvent('InventoryAdjusted', file, undefined, { path: 'events/InventoryAdjusted/versioned/0.0.1' });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('throws an error when trying to write to a event that does not exist', () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      expect(addFileToEvent('InventoryAdjusted', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    it('writes a file to a custom path when path option is provided', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addFileToEvent('InventoryAdjusted', file, undefined, { path: 'events/InventoryAdjusted' });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'test.txt'))).toBe(true);
    });

    describe('when events are within a service directory', () => {
      it('takes a given file and writes it to the location of the given event', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await addFileToEvent('InventoryAdjusted', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'test.txt'))).toBe(
          true
        );
      });

      it('takes a given file and version and writes the file to the correct location', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        // version the event
        await versionEvent('InventoryAdjusted');

        await addFileToEvent('InventoryAdjusted', file, '0.0.1');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.1', 'test.txt'))
        ).toBe(true);
      });
    });
  });

  describe('addSchemaToEvent', () => {
    it('takes a given file and writes it to the location of the given event', async () => {
      const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "age": {
            "type": "number"
          }
        }
      }`;
      const file = { schema, fileName: 'schema.json' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addSchemaToEvent('InventoryAdjusted', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "age": {
            "type": "number"
          }
        }
      }`;
      const file = { schema, fileName: 'schema.json' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // version the event
      await versionEvent('InventoryAdjusted');

      await addSchemaToEvent('InventoryAdjusted', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted/versioned/0.0.1', 'schema.json'))).toBe(true);
    });

    it('throws an error when trying to write to a event that does not exist', () => {
      const file = { schema: 'hello', fileName: 'test.txt' };

      expect(addSchemaToEvent('InventoryAdjusted', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    it('writes a schema to a custom path when path option is provided', async () => {
      const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          }
        }
      }`;
      const file = { schema, fileName: 'schema.json' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addSchemaToEvent('InventoryAdjusted', file, undefined, { path: 'events/InventoryAdjusted' });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'))).toBe(true);
    });

    it('if the file can be parsed into JSON, it will be parsed into JSON and written to the file formatted', async () => {
      const unformattedJson = `{ "name": "John", "age": 30 }`;
      const file = { schema: unformattedJson, fileName: 'schema.json' };

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addSchemaToEvent('InventoryAdjusted', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'))).toBe(true);
      const formattedJson = fs.readFileSync(path.join(CATALOG_PATH, 'events/InventoryAdjusted', 'schema.json'), 'utf8');
      expect(formattedJson).toBe(`{
  "name": "John",
  "age": 30
}`);
    });

    it('if the id of the event has a $ value in the id, the schema is still added to the event', async () => {
      const { getEvent } = utils(CATALOG_PATH);

      const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          }
        }
      }`;
      const file = { schema, fileName: 'schema.json' };

      await writeEvent({
        id: 'Inventory$Adjusted$1',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const event = await getEvent('Inventory$Adjusted$1');

      await addSchemaToEvent(event.id, file);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'events/Inventory$Adjusted$1', 'schema.json'))).toBe(true);
    });
    describe('when events are within a service directory', () => {
      it('takes a given file and writes it to the location of the given event', async () => {
        const schema = `{
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "number"
            }
          }
        }`;
        const file = { schema, fileName: 'schema.json' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await addSchemaToEvent('InventoryAdjusted', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'schema.json'))).toBe(
          true
        );
      });

      it('takes a given file and version and writes the file to the correct location', async () => {
        const schema = `{
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "number"
            }
          }
        }`;
        const file = { schema, fileName: 'schema.json' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeEventToService(
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        // version the event
        await versionEvent('InventoryAdjusted');

        await addSchemaToEvent('InventoryAdjusted', file, '0.0.1');

        expect(
          fs.existsSync(
            path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.1', 'schema.json')
          )
        ).toBe(true);
      });
    });
  });

  describe('eventHasVersion', () => {
    it('returns true when a given event and version exists in the catalog', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await eventHasVersion('InventoryAdjusted', '0.0.1')).toEqual(true);
    });

    it('returns true when a semver version is given and the version exists in the catalog', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await eventHasVersion('InventoryAdjusted', '0.0.x')).toEqual(true);
    });

    it('returns true when a `latest` version is given and the version exists in the catalog', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await eventHasVersion('InventoryAdjusted', 'latest')).toEqual(true);
    });

    it('returns false when event does not exist in the catalog', async () => {
      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await eventHasVersion('InventoryAdjusted', '5.0.0')).toEqual(false);
    });
  });
});
