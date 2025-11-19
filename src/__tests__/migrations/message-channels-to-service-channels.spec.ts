/**
 * This migration script will move EventCatalog channels defined in messages to the new API for services
 * For example; any catalog that has a message that has defined channels, the channel configuration will be moved to the service the sends or receives the message.
 */

import messageChannelsToServiceChannels from '../../migrations/message-channels-to-service-channels';
import { expect, it } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

describe('message-channels-to-service-channels', () => {
  beforeEach(() => {
    process.env.PROJECT_DIR = path.join(__dirname, 'catalog');
    // Clear the catalog directory
    fs.rmSync(path.join(process.env.PROJECT_DIR!), { recursive: true });
    // Copy test data from previous version of the catalog to a new catalog
    fs.cpSync(path.join(__dirname, 'message-channels-examples'), path.join(process.env.PROJECT_DIR!), { recursive: true });
  });

  it('if messages are found in the catalog that use channels, the migration script will move the channel configuration to the service that sends (to) or receives (from) the message', async () => {
    await messageChannelsToServiceChannels();

    const inventoryServiceFile = fs.readFileSync(
      path.join(process.env.PROJECT_DIR!, 'services', 'InventoryService', 'index.mdx'),
      'utf8'
    );
    const { data: inventoryServiceData } = matter(inventoryServiceFile);

    const orderServiceFile = fs.readFileSync(
      path.join(process.env.PROJECT_DIR!, 'domains', 'Orders', 'services', 'OrderService', 'index.mdx'),
      'utf8'
    );
    const { data: orderServiceData } = matter(orderServiceFile);

    expect(orderServiceData.receives[0].from).toEqual([{ id: 'eventbus', version: '1.0.0' }]);
    expect(orderServiceData.sends[0].to).toEqual([{ id: 'eventbus', version: '1.0.0' }]);

    expect(inventoryServiceData.receives[0].from).toEqual([{ id: 'eventbus', version: '1.0.0' }]);
    expect(inventoryServiceData.sends[0].to).toEqual([{ id: 'eventbus', version: '1.0.0' }]);
  });

  it('if messages are found in the catalog that use channels, the migration script will remove the channels from the message', async () => {
    // Before
    const messageBeforeMigration = fs.readFileSync(
      path.join(process.env.PROJECT_DIR!, 'services', 'InventoryService', 'events', 'OrderAmended', 'index.mdx'),
      'utf8'
    );
    const { data: beforeData } = matter(messageBeforeMigration);
    expect(beforeData.channels).toBeDefined();

    await messageChannelsToServiceChannels();

    const messageAfterMigration = fs.readFileSync(
      path.join(process.env.PROJECT_DIR!, 'services', 'InventoryService', 'events', 'OrderAmended', 'index.mdx'),
      'utf8'
    );
    const { data: afterData } = matter(messageAfterMigration);
    expect(afterData.channels).toBeUndefined();
  });

  it('if messages have multiple channels defined, the migration script will move the channel configuration to the service that sends (to) or receives (from) the message', async () => {
    await messageChannelsToServiceChannels();

    const multiChannelServiceFile = fs.readFileSync(
      path.join(process.env.PROJECT_DIR!, 'services', 'MultiChannelService', 'index.mdx'),
      'utf8'
    );
    const { data: multiChannelServiceData } = matter(multiChannelServiceFile);

    expect(multiChannelServiceData.sends[0].to).toEqual([
      { id: 'eventbus', version: '1.0.0' },
      { id: 'http-channel', version: '1.0.0' },
    ]);
  });
});
