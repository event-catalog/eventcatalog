import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockChannels, mockCommands, mockContainers, mockEvents, mockQueries, mockServices } from './mocks';
import {
  getProducersOfMessage,
  getServices,
  getConsumersOfMessage,
  getSpecificationsForService,
  getProducersAndConsumersForChannel,
} from '@utils/collections/services';

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
        case 'containers':
          return Promise.resolve(mockContainers);
        default:
          return Promise.resolve([]);
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

  describe('getSpecificationsForService', () => {
    it('when specifications are defined and an array in the service, it returns a list of specifications', async () => {
      const service = mockServices[0];

      // @ts-ignore
      const specifications = getSpecificationsForService(service);

      expect(specifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'asyncapi',
            path: 'asyncapi.yml',
            name: 'AsyncAPI Custom Name',
          }),
          expect.objectContaining({
            type: 'openapi',
            path: 'openapi.yml',
            name: 'OpenAPI Custom Name',
          }),
        ])
      );
    });

    it('when specifications are defined and not an array in the service, it returns a list of specifications with defaults for name and type', async () => {
      const service = mockServices[1];

      // @ts-ignore
      const specifications = getSpecificationsForService(service);

      expect(specifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'asyncapi',
            path: 'asyncapi.yml',
            name: 'AsyncAPI',
          }),
          expect.objectContaining({
            type: 'openapi',
            path: 'openapi.yml',
            name: 'OpenAPI',
          }),
        ])
      );
    });
  });

  describe('getProducersAndConsumersForChannel', () => {
    it('returns producers and consumers (services) for a given channel', async () => {
      const channel = mockChannels[0];

      // @ts-ignore
      const { producers, consumers } = await getProducersAndConsumersForChannel(channel);

      expect(producers).toHaveLength(2);
      expect(producers[0].data.id).toEqual('NotificationsService');
      expect(producers[1].data.id).toEqual('OrderService');

      expect(consumers).toHaveLength(3);
      expect(consumers[0].data.id).toEqual('InventoryService');
      expect(consumers[1].data.id).toEqual('NotificationsService');
      expect(consumers[2].data.id).toEqual('PaymentService');
    });
  });
});
