// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-commands');

const {
  writeCommand,
  getCommand,
  getCommands,
  rmCommand,
  rmCommandById,
  versionCommand,
  addFileToCommand,
  addSchemaToCommand,
  commandHasVersion,
  writeCommandToService,
  writeService,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Commands SDK', () => {
  describe('getCommand', () => {
    it('returns the given command id from EventCatalog and the latest version when no version is given,', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        attachments: ['https://example.com'],
        diagrams: [{ id: 'UpdateInventoryDiagram', version: '1.0.0' }],
      });

      const test = await getCommand('UpdateInventory');

      expect(test).toEqual({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        attachments: ['https://example.com'],
        diagrams: [{ id: 'UpdateInventoryDiagram', version: '1.0.0' }],
      });
    });

    it('returns the given command id from EventCatalog and the latest version when no version is given and the command is inside a services folder,', async () => {
      await writeService({
        id: 'Inventory',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });
      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { id: 'Inventory' }
      );

      const test = await getCommand('UpdateInventory');

      expect(test).toEqual({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the given command id from EventCatalog and the requested version when a version is given,', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionCommand('UpdateInventory');

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '1.0.0',
        summary: 'This is version 1.0.0',
        markdown: '# Hello world',
      });

      const test = await getCommand('UpdateInventory', '0.0.1');

      expect(test).toEqual({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the latest version of the command if the version matches the latest version', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const test = await getCommand('UpdateInventory', '0.0.1');

      expect(test).toEqual({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the command with the schema attached when the attachSchema option is set to true', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        schemaPath: 'schema.json',
      });

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await addSchemaToCommand('UpdateInventory', file);

      const test = await getCommand('UpdateInventory', '0.0.1', { attachSchema: true });

      expect(test.schema).toEqual(schema);
    });

    it('does not attach the schema if the attachSchema option is set to false', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        schemaPath: 'schema.json',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const test = await getCommand('UpdateInventory', '0.0.1', { attachSchema: false });

      expect(test.schema).toBeUndefined();
    });

    it('returns undefined if the command is not found', async () => {
      await expect(await getCommand('UpdateInventory')).toBe(undefined);
    });

    it('returns undefined if the command is  found but not the version', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await expect(await getCommand('UpdateInventory', '1.0.0')).toBe(undefined);
    });
  });

  describe('getCommands', () => {
    it('returns all the commands in the catalog,', async () => {
      // versioned command
      await writeCommand({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest command
      await writeCommand(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // command in the services folder
      await writeCommand(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      const commands = await getCommands({ latestOnly: false });

      expect(commands.length).toBe(3);
      expect(commands).toEqual(
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
    it('returns only the latest commands when `latestOnly` is set to true,', async () => {
      // versioned command
      await writeCommand({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest command
      await writeCommand(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // command in the services folder
      await writeCommand(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      // command in the services folder
      await writeCommand(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '2.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService', versionExistingContent: true }
      );

      const commands = await getCommands({ latestOnly: true });

      expect(commands).toEqual(
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

      expect(commands.length).toBe(2);
    });

    it('returns the commands with the schema attached when the attachSchema option is set to true', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        schemaPath: 'schema.json',
      });

      await addSchemaToCommand('UpdateInventory', file);

      const commands = await getCommands({ attachSchema: true });

      expect(commands[0].schema).toEqual(schema);
    });
  });

  describe('writeCommand', () => {
    it('writes the given command to EventCatalog and assumes the path if one if not given', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const command = await getCommand('UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      expect(command).toEqual({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('writes the given command (as md) to EventCatalog if the format is md', async () => {
      await writeCommand(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { format: 'md' }
      );

      const command = await getCommand('UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.md'))).toBe(true);
    });

    it('writes the given command to EventCatalog under the correct path when a path is given', async () => {
      await writeCommand(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/Inventory/UpdateInventory' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/Inventory/UpdateInventory', 'index.mdx'))).toBe(true);
    });

    it('throws an error when trying to write an command that already exists', async () => {
      const createEvent = async () =>
        writeCommand({
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

      await createEvent();

      await expect(
        writeCommand({
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        })
      ).rejects.toThrowError('Failed to write UpdateInventory (command) as the version 0.0.1 already exists');
    });

    describe('versionExistingContent', () => {
      it('versions the previous command when trying to write an command that already exists and versionExistingContent is true and the new version number is greater than the previous one', async () => {
        await writeCommand({
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeCommand(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        const channel = await getCommand('UpdateInventory');
        expect(channel.version).toBe('1.0.0');
        expect(channel.markdown).toBe('New');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.1', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write an channel and versionExistingContent is true and the new version number is not greater than the previous one', async () => {
        await writeCommand(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        await expect(
          writeCommand(
            {
              id: 'UpdateInventory',
              name: 'Update Inventory',
              version: '0.0.0',
              summary: 'This is a summary',
              markdown: 'New',
            },
            { versionExistingContent: true }
          )
        ).rejects.toThrowError('New version 0.0.0 is not greater than current version 1.0.0');
      });
    });
  });

  describe('writeCommandToService', () => {
    it('writes a command to the given service. When no version if given for the command the service is added to the latest service', async () => {
      await writeService({
        id: 'Inventory',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { id: 'Inventory' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(true);
    });

    it('writes a command to the given service (as md). When no version if given for the command the service is added to the latest service', async () => {
      await writeService(
        {
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        },
        { format: 'md' }
      );

      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { id: 'Inventory' },
        { format: 'md' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.md'))).toBe(true);
    });

    it('writes a command to the given service. When a version is given for the command the service is added to that service version', async () => {
      await writeService({
        id: 'Inventory',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { id: 'Inventory', version: '1.0.0' }
      );
      expect(
        fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/versioned/1.0.0/commands/UpdateInventory', 'index.mdx'))
      ).toBe(true);
    });
    it('writes a command to the given service. When a version is the latest the command is added to the latest version of the service', async () => {
      await writeService({
        id: 'Inventory',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { id: 'Inventory', version: 'latest' }
      );
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(true);
    });

    it('when override is true, it overrides the command if it already exists', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // Write the first event
      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
        }
      );

      await writeCommandToService(
        {
          id: 'UpdateInventory',
          name: 'Update Inventory',
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

      const command = await getCommand('UpdateInventory', '0.0.1');

      expect(command.markdown).toBe('Overridden content');
    });
  });

  describe('rmCommand', () => {
    it('removes a command from eventcatalog', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      await rmCommand('/UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);
    });
  });

  describe('rmCommandById', () => {
    it('removes an command from eventcatalog by id', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      await rmCommandById('UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);
    });

    it('removes a command and all files in that command', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      fs.writeFileSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'), 'SCHEMA!');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      await rmCommandById('UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'))).toBe(false);
    });

    it('removes a command but keeps its files when persistFiles is set to true', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      fs.writeFileSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'), 'SCHEMA!');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      await rmCommandById('UpdateInventory', '0.0.1', true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'))).toBe(true);
    });

    it('removes an command from eventcatalog by id and version', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      await rmCommandById('UpdateInventory', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);
    });

    it('if version is given, only removes that version and not any other versions of the command', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionCommand('UpdateInventory');

      // Write the versioned command
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.1', 'index.mdx'))).toBe(true);

      await rmCommandById('UpdateInventory', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.2', 'index.mdx'))).toBe(false);
    });

    describe('when commands are within a service directory', () => {
      it('removes an command from eventcatalog by id', async () => {
        await writeService({
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(true);

        await rmCommandById('UpdateInventory');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(false);
      });

      it('if version is given, only removes that version and not any other versions of the command', async () => {
        await writeService({
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        await versionCommand('UpdateInventory');

        // Write the versioned command
        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(true);
        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.1', 'index.mdx'))
        ).toBe(true);

        await rmCommandById('UpdateInventory', '0.0.1');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(true);

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.2', 'index.mdx'))
        ).toBe(false);
      });
    });
  });

  describe('versionCommand', () => {
    it('adds the given command to the versioned directory and removes itself from the root', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // // Add random file in there
      // await fs.writeFileSync(path.join(CATALOG_PATH, 'commands/Inventory/UpdateInventory', 'schema.json'), 'SCHEMA!');

      await versionCommand('UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.2', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);
    });
    it('adds the given command to the versioned directory and all files that are associated to it', async () => {
      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // Add random file in there
      await fs.writeFileSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'), 'SCHEMA!');

      await versionCommand('UpdateInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.2', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.2', 'schema.json'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'index.mdx'))).toBe(false);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'))).toBe(false);
    });

    describe('when commands are within a service directory', () => {
      it('adds the given command to the versioned directory and removes itself from the root', async () => {
        await writeService({
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        // // Add random file in there
        // await fs.writeFileSync(path.join(CATALOG_PATH, 'commands/Inventory/UpdateInventory', 'schema.json'), 'SCHEMA!');

        await versionCommand('UpdateInventory');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.2', 'index.mdx'))
        ).toBe(true);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(false);
      });
      it('adds the given command to the versioned directory and all files that are associated to it', async () => {
        await writeService({
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        // Add random file in there
        await fs.writeFileSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'schema.json'), 'SCHEMA!');

        await versionCommand('UpdateInventory');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.2', 'index.mdx'))
        ).toBe(true);

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.2', 'schema.json'))
        ).toBe(true);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'index.mdx'))).toBe(false);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'schema.json'))).toBe(false);
      });
    });
  });

  describe('addFileToCommand', () => {
    it('takes a given file and writes it to the location of the given command', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addFileToCommand('UpdateInventory', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'test.txt'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // version the command
      await versionCommand('UpdateInventory');

      await addFileToCommand('UpdateInventory', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('throws an error when trying to write to a command that does not exist', () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      expect(addFileToCommand('UpdateInventory', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    it('overrides the event when trying to write an event that already exists and override is true', async () => {
      await writeCommand({
        id: 'AdjustInventory',
        name: 'Adjust Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeCommand(
        {
          id: 'AdjustInventory',
          name: 'Adjust Inventory',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Overridden content',
        },
        {
          override: true,
        }
      );

      const command = await getCommand('AdjustInventory');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/AdjustInventory', 'index.mdx'))).toBe(true);
      expect(command.markdown).toBe('Overridden content');
    });

    describe('when commands are within a service directory', () => {
      it('takes a given file and writes it to the location of the given command', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeService({
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        await addFileToCommand('UpdateInventory', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'test.txt'))).toBe(true);
      });

      it('takes a given file and version and writes the file to the correct location', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeService({
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        // version the command
        await versionCommand('UpdateInventory');

        await addFileToCommand('UpdateInventory', file, '0.0.1');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.1', 'test.txt'))
        ).toBe(true);
      });
    });
  });

  describe('addSchemaToCommand', () => {
    it('takes a given file and writes it to the location of the given command', async () => {
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

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addSchemaToCommand('UpdateInventory', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory', 'schema.json'))).toBe(true);
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

      await writeCommand({
        id: 'UpdateInventory',
        name: 'Update Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // version the command
      await versionCommand('UpdateInventory');

      await addSchemaToCommand('UpdateInventory', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'commands/UpdateInventory/versioned/0.0.1', 'schema.json'))).toBe(true);
    });

    it('throws an error when trying to write to a command that does not exist', () => {
      const file = { schema: 'hello', fileName: 'test.txt' };

      expect(addSchemaToCommand('UpdateInventory', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    describe('when commands are within a service directory', () => {
      it('takes a given file and writes it to the location of the given command', async () => {
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
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        await addSchemaToCommand('UpdateInventory', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory', 'schema.json'))).toBe(true);
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
          id: 'Inventory',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeCommandToService(
          {
            id: 'UpdateInventory',
            name: 'Update Inventory',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'Inventory' }
        );

        // version the command
        await versionCommand('UpdateInventory');

        await addSchemaToCommand('UpdateInventory', file, '0.0.1');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/commands/UpdateInventory/versioned/0.0.1', 'schema.json'))
        ).toBe(true);
      });
    });
  });

  describe('commandHasVersion', () => {
    it('returns true when a given service and version exists in the catalog', async () => {
      await writeCommand({
        id: 'AdjustInventory',
        name: 'Adjust Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await commandHasVersion('AdjustInventory', '0.0.1')).toEqual(true);
    });

    it('returns true when a semver version is given and the version exists in the catalog', async () => {
      await writeCommand({
        id: 'AdjustInventory',
        name: 'Adjust Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await commandHasVersion('AdjustInventory', '0.0.x')).toEqual(true);
    });

    it('returns true when a `latest` version is given and the version exists in the catalog', async () => {
      await writeCommand({
        id: 'AdjustInventory',
        name: 'Adjust Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await commandHasVersion('AdjustInventory', 'latest')).toEqual(true);
    });

    it('returns false when event does not exist in the catalog', async () => {
      await writeCommand({
        id: 'AdjustInventory',
        name: 'Adjust Inventory',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await commandHasVersion('AdjustInventory', '5.0.0')).toEqual(false);
    });
  });
});
