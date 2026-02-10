import fs from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { Channel } from './types';
import { getResource, getResourcePath, getResources, rmResourceById, versionResource, writeResource } from './internal/resources';
import { findFileById } from './internal/utils';
import { getEvent, rmEventById, writeEvent } from './events';
import { getCommand, rmCommandById, writeCommand } from './commands';
import { getQuery, rmQueryById, writeQuery } from './queries';

/**
 * Returns a channel from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the channel
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getChannel } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the channel
 * const channel = await getChannel('InventoryChannel');
 *
 * // Gets a version of the channel
 * const channel = await getChannel('InventoryChannel', '0.0.1');
 * ```
 */
export const getChannel =
  (directory: string) =>
  async (id: string, version?: string): Promise<Channel> =>
    getResource(directory, id, version, { type: 'channel' }) as Promise<Channel>;

/**
 * Returns all channels from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the channels.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getChannels } = utils('/path/to/eventcatalog');
 *
 * // Gets all channels (and versions) from the catalog
 * const channels = await getChannels();
 *
 * // Gets all channels (only latest version) from the catalog
 * const channels = await getChannels({ latestOnly: true });
 * ```
 */
export const getChannels =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Channel[]> =>
    getResources(directory, { type: 'channels', ...options }) as Promise<Channel[]>;

/**
 * Write a channel to EventCatalog.
 *
 * You can optionally override the path of the channel.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeChannel } = utils('/path/to/eventcatalog');
 *
 * // Write a channel to the catalog
 * // channel would be written to channels/inventory.{env}.events
 * await writeChannel({
 *   id: 'inventory.{env}.events',
 *   name: 'Inventory channel',
 *   version: '0.0.1',
 *   summary: 'This is a summary',
 *   markdown: '# Hello world',
 *   address: inventory.{env}.events,
 * protocols: ['http'],
 * });
 *
 * // Write a channel to the catalog but override the path
 * // channel would be written to channels/Inventory/InventoryChannel
 * await writeChannel({
 *    id: 'InventoryChannel',
 *    name: 'Update Inventory',
 *    version: '0.0.1',
 *    summary: 'This is a summary',
 *    markdown: '# Hello world',
 *    address: inventory.{env}.events,
 *    protocols: ['http'],
 * }, { path: "/channels/Inventory/InventoryChannel"});
 *
 * // Write a channel to the catalog and override the existing content (if there is any)
 * await writeChannel({
 *    id: 'InventoryChannel',
 *    name: 'Update Inventory',
 *    version: '0.0.1',
 *    summary: 'This is a summary',
 *    markdown: '# Hello world',
 *    address: inventory.{env}.events,
 *    protocols: ['http'],
 * }, { override: true });
 *
 * // Write a channel to the catalog and version the previous version
 * // only works if the new version is greater than the previous version
 * await writeChannel({
 *    id: 'InventoryChannel',
 *    name: 'Update Inventory',
 *    version: '0.0.1',
 *    summary: 'This is a summary',
 *    markdown: '# Hello world',
 *    address: inventory.{env}.events,
 *    protocols: ['http'],
 * }, { versionExistingContent: true });
 * ```
 */
export const writeChannel =
  (directory: string) =>
  async (
    channel: Channel,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = { path: '' }
  ) =>
    writeResource(directory, { ...channel }, { ...options, type: 'channel' });

/**
 * Delete a channel at it's given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmChannel } = utils('/path/to/eventcatalog');
 *
 * // removes a channel at the given path (channels dir is appended to the given path)
 * // Removes the channel at channels/InventoryChannel
 * await rmChannel('/InventoryChannel');
 * ```
 */
export const rmChannel = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
};

/**
 * Delete a channel by it's id.
 *
 * Optionally specify a version to delete a specific version of the channel.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmChannelById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest InventoryChannel channel
 * await rmChannelById('inventory.{env}.events');
 *
 * // deletes a specific version of the InventoryChannel channel
 * await rmChannelById('inventory.{env}.events', '0.0.1');
 * ```
 */
export const rmChannelById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) =>
  rmResourceById(directory, id, version, { type: 'channel', persistFiles });

/**
 * Version a channel by it's id.
 *
 * Takes the latest channel and moves it to a versioned directory.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionChannel } = utils('/path/to/eventcatalog');
 *
 * // moves the latest inventory.{env}.events channel to a versioned directory
 * // the version within that channel is used as the version number.
 * await versionChannel('inventory.{env}.events');
 *
 * ```
 */
export const versionChannel = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Check to see if the catalog has a version for the given channel.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { channelHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given event and version (supports semver)
 * await channelHasVersion('inventory.{env}.events', '0.0.1');
 * await channelHasVersion('inventory.{env}.events', 'latest');
 * await channelHasVersion('inventory.{env}.events', '0.0.x');*
 *
 * ```
 */
export const channelHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

/**
 * Add an event/command/query to a channel by it's id.
 *
 * Optionally specify a version to add the message to a specific version of the service.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * // Adds an event to the service or command to the service
 * const { addEventToChannel, addCommandToChannel, addQueryToChannel } = utils('/path/to/eventcatalog');
 *
 * // Adds a new event (InventoryUpdatedEvent) that the InventoryService will send
 * await addEventToChannel('InventoryService', 'sends', { event: 'InventoryUpdatedEvent', version: '2.0.0' });
 * * // Adds a new event (OrderComplete) that the InventoryService will receive
 * await addEventToChannel('InventoryService', 'receives', { event: 'OrderComplete', version: '1.0.0' });
 *
 * // Adds a new command (UpdateInventoryCommand) that the InventoryService will send
 * await addCommandToChannel('InventoryService', 'sends', { command: 'UpdateInventoryCommand', version: '2.0.0' });
 * // Adds a new command (VerifyInventory) that the InventoryService will receive
 * await addCommandToChannel('InventoryService', 'receives', { command: 'VerifyInventory', version: '1.0.0' });
 *
 * // Adds a new query (GetInventoryQuery) that the InventoryService will send
 * await addQueryToChannel('InventoryService', 'sends', { query: 'GetInventoryQuery', version: '2.0.0' });
 * // Adds a new query (GetOrder) that the InventoryService will receive
 * await addQueryToChannel('InventoryService', 'receives', { query: 'GetOrder', version: '1.0.0' });
 *
 * ```
 */

export const addMessageToChannel =
  (directory: string, collection: string) =>
  async (id: string, _message: { id: string; version: string; parameters?: { [key: string]: string } }, version?: string) => {
    let channel: Channel = await getChannel(directory)(id, version);

    const functions = {
      events: {
        getMessage: getEvent,
        rmMessageById: rmEventById,
        writeMessage: writeEvent,
      },
      commands: {
        getMessage: getCommand,
        rmMessageById: rmCommandById,
        writeMessage: writeCommand,
      },
      queries: {
        getMessage: getQuery,
        rmMessageById: rmQueryById,
        writeMessage: writeQuery,
      },
    };

    const { getMessage, rmMessageById, writeMessage } = functions[collection as keyof typeof functions];

    const message = await getMessage(directory)(_message.id, _message.version);
    const messagePath = await getResourcePath(directory, _message.id, _message.version);
    const extension = extname(messagePath?.fullPath || '');

    if (!message) throw new Error(`Message ${_message.id} with version ${_message.version} not found`);

    if (message.channels === undefined) {
      message.channels = [];
    }

    const channelInfo = { id, version: channel.version, ...(_message.parameters && { parameters: _message.parameters }) };
    message.channels.push(channelInfo);

    // Add the message where it was to start..
    const existingResource = await findFileById(directory, _message.id, _message.version);

    if (!existingResource) {
      throw new Error(`Cannot find message ${id} in the catalog`);
    }

    const path = existingResource.split(`/[\\/]+${collection}`)[0];
    const pathToResource = join(path, collection);

    await rmMessageById(directory)(_message.id, _message.version, true);
    await writeMessage(pathToResource)(message, { format: extension === '.md' ? 'md' : 'mdx' });
  };
