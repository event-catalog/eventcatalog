import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices } from './mocks';
import { getProducersOfMessage, getServices, getConsumersOfMessage } from '@utils/collections/services';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
      }
    },
  };
});

describe('Services', () => {
  describe('getServices', () => {
    it('should returns an array of services', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            collection: 'services',
            data: expect.objectContaining({
              id: 'OrderService',
              version: '1.0.0',
              receives: expect.any(Array),
              sends: expect.any(Array),
            }),
          }),
          expect.objectContaining({
            collection: 'services',
            data: expect.objectContaining({
              id: 'InventoryService',
              version: '1.0.0',
              receives: expect.any(Array),
              sends: expect.any(Array),
            }),
          }),
        ])
      );
    });

    it('should returns an array of services with messages (sends/receives)', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          /** OrderService */
          expect.objectContaining({
            id: 'services/Order/OrderService/index.mdx',
            slug: 'services/Order/OrderService',
            collection: 'services',
            data: expect.objectContaining({
              id: 'OrderService',
              version: '1.0.0',
              receives: [mockCommands[0]],
              sends: [mockEvents[0]],
            }),
          }),
        ])
      );
    });

    it('should returns an array of services with messages (sends/receives) when version is specified as semver range', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'services/Inventory/InventoryService/index.mdx',
            slug: 'services/Inventory/InventoryService',
            collection: 'services',
            data: expect.objectContaining({
              id: 'InventoryService',
              version: '1.0.0',
              receives: [mockEvents[2]],
              sends: [mockEvents[7]],
            }),
          }),
        ])
      );
    });

    it('should returns an array of services with messages (sends/receives) when version is specified as latest or undefined', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'services/Payment/PaymentService/index.mdx',
            slug: 'services/Payment/PaymentService',
            collection: 'services',
            data: expect.objectContaining({
              id: 'PaymentService',
              version: '1.0.0',
              receives: [mockEvents[3], mockEvents[4]],
              sends: [mockEvents[9], mockEvents[11], mockEvents[12]],
            }),
          }),
        ])
      );
    });
  });

  describe('getProducersOfMessage', () => {

    it('should return an array of services that publish a message', async () => {
      const services = await getServices();
      const message = mockEvents[12];

      // @ts-ignore
      const servicesThatPublishMessage = getProducersOfMessage(services, message);

      expect(servicesThatPublishMessage).toHaveLength(1);
      expect(servicesThatPublishMessage[0].data.id).toEqual('PaymentService');

    });

    it('should return an array of services that publish a message with a specific version', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          sends: [
            {
              id: 'SomeTestEvent',
              version: '0.0.1',
            },
          ],
          receives: [],
        },
      };

      // @ts-ignore
      const servicesThatPublishMessage = getProducersOfMessage([service], message);

      expect(servicesThatPublishMessage).toHaveLength(1);
      expect(servicesThatPublishMessage[0].data.id).toEqual('SomeTestService');
    });

    it('if the service uses latest, it should return all services that publish the message', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          sends: [
            {
              id: 'SomeTestEvent',
              version: 'latest',
            },
          ],
          receives: [],
        },
      };

      // @ts-ignore
      const servicesThatPublishMessage = getProducersOfMessage([service], message);

      expect(servicesThatPublishMessage).toHaveLength(1);
      expect(servicesThatPublishMessage[0].data.id).toEqual('SomeTestService');
    });

    it('if the service does not have a version, it should return all services that publish the message', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          sends: [
            {
              id: 'SomeTestEvent',
            },
          ],
          receives: [],
        },
      };

      // @ts-ignore
      const servicesThatPublishMessage = getProducersOfMessage([service], message);

      expect(servicesThatPublishMessage).toHaveLength(1);
      expect(servicesThatPublishMessage[0].data.id).toEqual('SomeTestService');
    });

    it('if the service has a version for the message, but they do not match, it should not return any services', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          sends: [
            {
              id: 'SomeTestEvent',
              version: '1.0.0',
            },
          ],
          receives: [],
        },
      };

      // @ts-ignore
      const servicesThatPublishMessage = getProducersOfMessage([service], message);

      expect(servicesThatPublishMessage).toHaveLength(0);
    });
  });

  describe('getConsumersOfMessage', () => {

    it('should return an array of services that consume a message with a specific version', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          receives: [
            {
              id: 'SomeTestEvent',
              version: '0.0.1',
            },
          ],
          sends: [],
        },
      };

      // @ts-ignore
      const servicesThatConsumeMessage = getConsumersOfMessage([service], message);

      expect(servicesThatConsumeMessage).toHaveLength(1);
      expect(servicesThatConsumeMessage[0].data.id).toEqual('SomeTestService');
    });

    it('if the service uses latest, it should return all services that consume the message', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          receives: [
            {
              id: 'SomeTestEvent',
              version: 'latest',
            },
          ],
          sends: [],
        },
      };

      // @ts-ignore
      const servicesThatConsumeMessage = getConsumersOfMessage([service], message);

      expect(servicesThatConsumeMessage).toHaveLength(1);
      expect(servicesThatConsumeMessage[0].data.id).toEqual('SomeTestService');
    });

    it('if the service does not have a version, it should return all services that consume the message', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          receives: [
            {
              id: 'SomeTestEvent',
            },
          ],
          sends: [],
        },
      };

      // @ts-ignore
      const servicesThatConsumeMessage = getConsumersOfMessage([service], message);

      expect(servicesThatConsumeMessage).toHaveLength(1);
      expect(servicesThatConsumeMessage[0].data.id).toEqual('SomeTestService');
    });

    it('if the service has a version for the message, but they do not match, it should not return any services', async () => {
      const message = {
        slug: 'SomeTestEvent',
        collection: 'events',
        data: {
          id: 'SomeTestEvent',
          version: '0.0.1',
        },
      };

      const service = {
        ...mockServices[0],
        data: {
          ...mockServices[0].data,
          id: 'SomeTestService',
          receives: [
            {
              id: 'SomeTestEvent',
              version: '1.0.0',
            },
          ],
          sends: [],
        },
      };

      // @ts-ignore
      const servicesThatConsumeMessage = getConsumersOfMessage([service], message);

      expect(servicesThatConsumeMessage).toHaveLength(0);
    });
  });

});


