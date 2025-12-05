import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockServices, mockCommands } from './mocks';
import { getCommands } from '@utils/collections/commands';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'commands':
          return Promise.resolve(mockCommands);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Commands', () => {
  describe('getCommands', () => {
    it('should returns an array of commands', async () => {
      const commands = await getCommands();

      expect(commands).toEqual(
        expect.arrayContaining(
          [
            {
              id: 'AdjustOrder',
              slug: 'AdjustOrder',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'AdjustOrder',
                version: '0.0.1',
              }),
            },
            {
              id: 'PlaceOrder',
              slug: 'PlaceOrder',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'PlaceOrder',
                version: '1.5.1',
              }),
            },
            {
              id: 'PlaceOrder',
              slug: 'PlaceOrder',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'PlaceOrder',
                version: '2.0.1',
              }),
            },
            {
              id: 'NotifyLowStock',
              slug: 'NotifyLowStock',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'NotifyLowStock',
                version: '2.0.0',
              }),
            },
            {
              id: 'NotifyLowStock',
              slug: 'NotifyLowStock',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'NotifyLowStock',
                version: '2.0.1',
              }),
            },
          ].map((e) => expect.objectContaining(e))
        )
      );
    });

    it('should returns an array of commands with producers/consumers', async () => {
      const commands = await getCommands();

      expect(commands).toEqual(
        expect.arrayContaining(
          [
            {
              id: 'AdjustOrder',
              slug: 'AdjustOrder',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'AdjustOrder',
                version: '0.0.1',
                producers: [/* OrderService */ mockServices[0]],
                consumers: [/* PaymentService */ mockServices[1]],
              }),
            },
          ].map((c) => expect.objectContaining(c))
        )
      );
    });

    it('should returns an array of commands with producers/consumers when they use semver range', async () => {
      const commands = await getCommands();

      expect(commands).toEqual(
        expect.arrayContaining(
          [
            {
              id: 'PlaceOrder',
              slug: 'PlaceOrder',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'PlaceOrder',
                version: '1.5.1',
                consumers: [/* OrderService */ mockServices[0]],
              }),
            },
            {
              id: 'PlaceOrder',
              slug: 'PlaceOrder',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'PlaceOrder',
                version: '2.0.1',
                consumers: [/* OrderService */ mockServices[0]],
              }),
            },
          ].map((c) => expect.objectContaining(c))
        )
      );
    });

    it('should returns an array of commands with producers/consumers when they use latest/undefined version', async () => {
      const commands = await getCommands();

      expect(commands).toEqual(
        expect.arrayContaining(
          [
            {
              id: 'NotifyLowStock',
              slug: 'NotifyLowStock',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'NotifyLowStock',
                version: '2.0.0',
                consumers: [],
                producers: [],
              }),
            },
            {
              id: 'NotifyLowStock',
              slug: 'NotifyLowStock',
              collection: 'commands',
              data: expect.objectContaining({
                id: 'NotifyLowStock',
                version: '2.0.1',
                producers: [/* InventoryService */ mockServices[2]],
                consumers: [/* NotificationService */ mockServices[3]],
              }),
            },
          ].map((c) => expect.objectContaining(c))
        )
      );
    });
  });
});
