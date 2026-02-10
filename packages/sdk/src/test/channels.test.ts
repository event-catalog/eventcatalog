// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';
const CATALOG_PATH = path.join(__dirname, 'catalog-channels');

const {
  writeChannel,
  getChannel,
  getChannels,
  rmChannel,
  rmChannelById,
  versionChannel,
  channelHasVersion,
  addEventToChannel,
  writeEvent,
  getEvent,
  addFileToEvent,
  addCommandToChannel,
  writeCommand,
  getCommand,
  addFileToCommand,
  addQueryToChannel,
  writeQuery,
  getQuery,
  addFileToQuery,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

const mockChannel = {
  id: 'inventory.{env}.events',
  name: 'Inventory Channel',
  version: '0.0.1',
  summary: 'This is a summary',
  markdown: '# Hello world',
  address: 'inventory.{env}.events',
  protocols: ['kafka'],
  parameters: {
    env: {
      enum: ['dev', 'staging', 'prod'],
      default: 'dev',
      description: 'The environment to deploy to',
    },
  },
};

describe('Channels SDK', () => {
  describe('getChannel', () => {
    it('returns the given channel id from EventCatalog and the latest version when no version is given,', async () => {
      await writeChannel(mockChannel);

      const test = await getChannel('inventory.{env}.events');

      expect(test).toEqual(mockChannel);
    });

    it('returns the given channel id from EventCatalog and the requested version when a version is given,', async () => {
      await writeChannel(mockChannel);

      await versionChannel('inventory.{env}.events');

      await writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });

      const test = await getChannel('inventory.{env}.events', '0.0.1');

      expect(test).toEqual(mockChannel);
    });

    it('returns the latest version of the channel if the version matches the latest version', async () => {
      await writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });

      const test = await getChannel('inventory.{env}.events', '1.0.0');

      expect(test).toEqual({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });
    });

    it('returns undefined if the channel is not found', async () => {
      await expect(await getChannel('inventory.{env}.events')).toBe(undefined);
    });

    it('returns undefined if the channel is found but not the version', async () => {
      await writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await expect(await getChannel('inventory.{env}.events', '1.0.0')).toBe(undefined);
    });
  });

  describe('getChannels', () => {
    it('returns all the channels in the catalog,', async () => {
      // versioned channel
      await writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });

      // latest channel
      await writeChannel(
        {
          id: 'inventory.{env}.events',
          name: 'Inventory Channel',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          address: 'inventory.{env}.events',
          protocols: ['kafka'],
          parameters: {
            env: {
              enum: ['dev', 'staging', 'prod'],
              default: 'dev',
              description: 'The environment to deploy to',
            },
          },
        },
        { versionExistingContent: true }
      );

      // channel in the services folder
      await writeChannel(
        {
          id: 'order.{env}.events',
          name: 'Order Channel',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          address: 'order.{env}.events',
          protocols: ['kafka'],
          parameters: {
            env: {
              enum: ['dev', 'staging', 'prod'],
              default: 'dev',
              description: 'The environment to deploy to',
            },
          },
        },
        { path: '/services/OrderService' }
      );

      const channels = await getChannels();

      expect(channels).toEqual(
        expect.arrayContaining([
          {
            id: 'inventory.{env}.events',
            name: 'Inventory Channel',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
            address: 'inventory.{env}.events',
            protocols: ['kafka'],
            parameters: {
              env: {
                enum: ['dev', 'staging', 'prod'],
                default: 'dev',
                description: 'The environment to deploy to',
              },
            },
          },
          {
            id: 'order.{env}.events',
            name: 'Order Channel',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
            address: 'order.{env}.events',
            protocols: ['kafka'],
            parameters: {
              env: {
                enum: ['dev', 'staging', 'prod'],
                default: 'dev',
                description: 'The environment to deploy to',
              },
            },
          },
          {
            id: 'inventory.{env}.events',
            name: 'Inventory Channel',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
            address: 'inventory.{env}.events',
            protocols: ['kafka'],
            parameters: {
              env: {
                enum: ['dev', 'staging', 'prod'],
                default: 'dev',
                description: 'The environment to deploy to',
              },
            },
          },
        ])
      );
      expect(channels).toHaveLength(3);
    });

    it('returns only the latest channels when `latestOnly` is set to true,', async () => {
      // versioned channel
      await writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });

      // latest channel
      await writeChannel(
        {
          id: 'inventory.{env}.events',
          name: 'Inventory Channel',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          address: 'inventory.{env}.events',
          protocols: ['kafka'],
          parameters: {
            env: {
              enum: ['dev', 'staging', 'prod'],
              default: 'dev',
              description: 'The environment to deploy to',
            },
          },
        },
        { versionExistingContent: true }
      );

      // channel in the services folder
      await writeChannel(
        {
          id: 'order.{env}.events',
          name: 'Order Channel',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          address: 'order.{env}.events',
          protocols: ['kafka'],
          parameters: {
            env: {
              enum: ['dev', 'staging', 'prod'],
              default: 'dev',
              description: 'The environment to deploy to',
            },
          },
        },
        { path: '/services/OrderService' }
      );

      // channel in the services folder
      await writeChannel(
        {
          id: 'order.{env}.events',
          name: 'Order Channel',
          version: '2.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          address: 'order.{env}.events',
          protocols: ['kafka'],
          parameters: {
            env: {
              enum: ['dev', 'staging', 'prod'],
              default: 'dev',
              description: 'The environment to deploy to',
            },
          },
        },
        { path: '/services/OrderService', versionExistingContent: true }
      );

      const channels = await getChannels({ latestOnly: true });

      expect(channels).toEqual(
        expect.arrayContaining([
          {
            id: 'inventory.{env}.events',
            name: 'Inventory Channel',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
            address: 'inventory.{env}.events',
            protocols: ['kafka'],
            parameters: {
              env: {
                enum: ['dev', 'staging', 'prod'],
                default: 'dev',
                description: 'The environment to deploy to',
              },
            },
          },
          {
            id: 'order.{env}.events',
            name: 'Order Channel',
            version: '2.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
            address: 'order.{env}.events',
            protocols: ['kafka'],
            parameters: {
              env: {
                enum: ['dev', 'staging', 'prod'],
                default: 'dev',
                description: 'The environment to deploy to',
              },
            },
          },
        ])
      );
      expect(channels).toHaveLength(2);
    });
  });

  describe('writeChannel', () => {
    it('writes the given channel to EventCatalog and assumes the path if one if not given', async () => {
      await writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        routes: [{ id: 'InventoryChannel', version: '1.0.0' }],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });

      const channel = await getChannel('inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);

      expect(channel).toEqual({
        id: 'inventory.{env}.events',
        name: 'Inventory Channel',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
        address: 'inventory.{env}.events',
        protocols: ['kafka'],
        routes: [{ id: 'InventoryChannel', version: '1.0.0' }],
        parameters: {
          env: {
            enum: ['dev', 'staging', 'prod'],
            default: 'dev',
            description: 'The environment to deploy to',
          },
        },
      });
    });

    it('writes the given channel (as md) to EventCatalog when format is md and assumes the path if one if not given', async () => {
      await writeChannel(
        {
          id: 'inventory.{env}.events',
          name: 'Inventory Channel',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          address: 'inventory.{env}.events',
          protocols: ['kafka'],
          parameters: {
            env: {
              enum: ['dev', 'staging', 'prod'],
              default: 'dev',
              description: 'The environment to deploy to',
            },
          },
        },
        { format: 'md' }
      );

      const channel = await getChannel('inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.md'))).toBe(true);
    });

    it('writes the given channel to EventCatalog under the correct path when a path is given', async () => {
      await writeChannel(mockChannel, { path: '/Inventory/InventoryChannel' });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/Inventory/InventoryChannel', 'index.mdx'))).toBe(true);
    });

    it('throws an error when trying to write an channel that already exists', async () => {
      const createChannel = async (props?: any) => writeChannel({ ...mockChannel, ...props });

      await createChannel();

      await expect(writeChannel(mockChannel)).rejects.toThrowError(
        'Failed to write inventory.{env}.events (channel) as the version 0.0.1 already exists'
      );
    });

    it('overrides the channel when trying to write an channel that already exists and override is true', async () => {
      await writeChannel({ ...mockChannel });

      await writeChannel({ ...mockChannel, markdown: 'Overridden content' }, { override: true });

      const channel = await getChannel('inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);
      expect(channel.markdown).toBe('Overridden content');
    });

    describe('versionExistingContent', () => {
      it('versions the previous channel when trying to write an channel that already exists and versionExistingContent is true and the new version number is greater than the previous one', async () => {
        await writeChannel(mockChannel);

        await writeChannel(
          {
            ...mockChannel,
            version: '1.0.0',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        const channel = await getChannel('inventory.{env}.events');
        expect(channel.version).toBe('1.0.0');
        expect(channel.markdown).toBe('New');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events/versioned/0.0.1', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write an channel and versionExistingContent is true and the new version number is not greater than the previous one', async () => {
        await writeChannel(mockChannel);

        await expect(writeChannel({ ...mockChannel, version: '0.0.0' }, { versionExistingContent: true })).rejects.toThrowError(
          'New version 0.0.0 is not greater than current version 0.0.1'
        );
      });
    });
  });

  describe('rmChannel', () => {
    it('removes a channel from eventcatalog', async () => {
      await writeChannel(mockChannel);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);

      await rmChannel('/inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(false);
    });
  });

  describe('rmChannelById', () => {
    it('removes an channel from eventcatalog by id', async () => {
      await writeChannel(mockChannel);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);

      await rmChannelById('inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(false);
    });

    it('removes an channel from eventcatalog by id and version', async () => {
      await writeChannel(mockChannel);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);

      await rmChannelById('inventory.{env}.events', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(false);
    });

    it('if version is given, only removes that version and not any other versions of the channel', async () => {
      await writeChannel(mockChannel);

      await versionChannel('inventory.{env}.events');

      // Write the versioned channel
      await writeChannel({
        ...mockChannel,
        version: '0.0.2',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events/versioned/0.0.1', 'index.mdx'))).toBe(true);

      await rmChannelById('inventory.{env}.events', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events/versioned/0.0.2', 'index.mdx'))).toBe(false);
    });
  });

  describe('versionChannel', () => {
    it('adds the given channel to the versioned directory and removes itself from the root', async () => {
      await writeChannel(mockChannel);

      await versionChannel('inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events/versioned/0.0.1', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(false);
    });

    // channel tends not to have any files associated with it (yet)
    it('adds the given channel to the versioned directory and all files that are associated to it', async () => {
      await writeChannel(mockChannel);

      // Add random file in there
      await fs.writeFileSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'schema.json'), 'SCHEMA!');

      await versionChannel('inventory.{env}.events');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events/versioned/0.0.1', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events/versioned/0.0.1', 'schema.json'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'index.mdx'))).toBe(false);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'channels/inventory.{env}.events', 'schema.json'))).toBe(false);
    });
  });

  describe('channelHasVersion', () => {
    it('returns true when a given service and version exists in the catalog', async () => {
      await writeChannel(mockChannel);

      expect(await channelHasVersion('inventory.{env}.events', '0.0.1')).toEqual(true);
    });

    it('returns true when a semver version is given and the version exists in the catalog', async () => {
      await writeChannel(mockChannel);

      expect(await channelHasVersion('inventory.{env}.events', '0.0.x')).toEqual(true);
    });

    it('returns true when a `latest` version is given and the version exists in the catalog', async () => {
      await writeChannel(mockChannel);

      expect(await channelHasVersion('inventory.{env}.events', 'latest')).toEqual(true);
    });

    it('returns false when event does not exist in the catalog', async () => {
      await writeChannel(mockChannel);

      expect(await channelHasVersion('inventory.{env}.events', '5.0.0')).toEqual(false);
    });
  });

  describe('adding messages to channels', () => {
    describe('addEventToChannel', () => {
      it('adds the channel to the given event', async () => {
        await writeChannel(mockChannel);
        await writeEvent({
          id: 'InventoryCreated',
          name: 'Inventory Created',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addEventToChannel('inventory.{env}.events', {
          id: 'InventoryCreated',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        const event = await getEvent('InventoryCreated');

        // expect the path
        expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryCreated', 'index.mdx'))).toBe(true);

        expect(event.channels).toEqual([
          {
            id: 'inventory.{env}.events',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          },
        ]);
      });

      it('adds the channel to the given event, any files that were on the event are persisted', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeChannel(mockChannel);
        await writeEvent({
          id: 'InventoryCreated',
          name: 'Inventory Created',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addFileToEvent('InventoryCreated', file);

        await addEventToChannel('inventory.{env}.events', {
          id: 'InventoryCreated',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        const event = await getEvent('InventoryCreated');

        expect(event.channels).toEqual([
          {
            id: 'inventory.{env}.events',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          },
        ]);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'events/InventoryCreated', 'test.txt'))).toBe(true);
      });

      it('the folder location of the event does not change when adding a message to the event', async () => {
        await writeChannel(mockChannel);
        await writeEvent({
          id: 'InventoryCreated',
          name: 'Inventory Created',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addEventToChannel('inventory.{env}.events', {
          id: 'InventoryCreated',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        const pathToEvent = path.join(CATALOG_PATH, 'events', 'InventoryCreated');
        expect(fs.existsSync(pathToEvent)).toEqual(true);
      });

      it('throws an error when message cannot be found', async () => {
        await writeChannel(mockChannel);

        await expect(
          addEventToChannel('inventory.{env}.events', {
            id: 'InventoryCreated',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          })
        ).rejects.toThrowError('Message InventoryCreated with version 0.0.1 not found');
      });
    });

    describe('addCommandToChannel', () => {
      it('adds the channel to the given command', async () => {
        await writeChannel(mockChannel);
        await writeCommand({
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addCommandToChannel('inventory.{env}.events', {
          id: 'UpdateInventory',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        const command = await getCommand('UpdateInventory');

        expect(command.channels).toEqual([
          {
            id: 'inventory.{env}.events',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          },
        ]);
      });

      it('adds the channel to the given command, any files that were on the command are persisted', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeChannel(mockChannel);
        await writeCommand({
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addFileToCommand('UpdateInventory', file);

        await addCommandToChannel('inventory.{env}.events', {
          id: 'UpdateInventory',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'test.txt'))).toBe(true);
      });

      it('throws an error when message cannot be found', async () => {
        await writeChannel(mockChannel);

        await expect(
          addCommandToChannel('inventory.{env}.events', {
            id: 'UpdateInventory',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          })
        ).rejects.toThrowError('Message UpdateInventory with version 0.0.1 not found');
      });
    });

    describe('addQueryToChannel', () => {
      it('adds the channel to the given query', async () => {
        await writeChannel(mockChannel);
        await writeQuery({
          id: 'GetInventory',
          name: 'Get Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addQueryToChannel('inventory.{env}.events', {
          id: 'GetInventory',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        const query = await getQuery('GetInventory');

        expect(query.channels).toEqual([
          {
            id: 'inventory.{env}.events',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          },
        ]);
      });

      it('adds the channel to the given query, any files that were on the query are persisted', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeChannel(mockChannel);
        await writeQuery({
          id: 'GetInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await addFileToQuery('GetInventory', file);

        await addQueryToChannel('inventory.{env}.events', {
          id: 'GetInventory',
          version: '0.0.1',
          parameters: {
            env: 'dev',
          },
        });

        expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetInventory', 'test.txt'))).toBe(true);
      });

      it('throws an error when message cannot be found', async () => {
        await writeChannel(mockChannel);

        await expect(
          addQueryToChannel('inventory.{env}.events', {
            id: 'GetInventory',
            version: '0.0.1',
            parameters: {
              env: 'dev',
            },
          })
        ).rejects.toThrowError('Message GetInventory with version 0.0.1 not found');
      });
    });

    // AddQueryToService
  });
});
