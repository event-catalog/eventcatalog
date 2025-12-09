import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockDomains, mockServices, mockEvents, mockCommands } from './mocks';
import { getNodesAndEdges } from '@utils/node-graphs/domains-node-graph';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'domains':
          return Promise.resolve(mockDomains);
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Domains NodeGraph', () => {
  describe('getNodesAndEdges', () => {
    it('returns an empty array if no domains are found', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownDomain', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given domain', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'Shipping', version: '0.0.1' });

      const expectedServiceNode = {
        id: 'LocationService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[0].data }, group: expect.anything() },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedEventNode = {
        id: 'OrderPlaced-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          mode: 'simple',
          message: { ...mockEvents[0].data },
          group: {
            type: 'Domain',
            value: 'Checkout',
            id: 'Checkout',
          },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'OrderPlaced-0.0.1-LocationService-0.0.1',
          source: 'OrderPlaced-0.0.1',
          target: 'LocationService-0.0.1',
          label: 'subscribed by',
          animated: false,
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedEventNode),

          // The command node itself
          expect.objectContaining(expectedServiceNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('should return a list of nodes and edges with a domain has subdomains', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'Shipping', version: '0.0.1' });

      // Expect the orders service to be rendered (it's a service in a subdomain)
      const expectedEventNode = {
        id: 'OrderService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          mode: 'simple',
          service: expect.objectContaining({
            id: 'OrderService',
            version: '1.0.0',
          }),
          group: {
            type: 'Domain',
            value: 'Checkout',
            id: 'Checkout',
          },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining(expectedEventNode)]));

      expect(nodes.length).toEqual(9);
      expect(edges.length).toEqual(8);
    });

    // it.only('should return nodes and edges for a given domain with services using semver range or latest version (version undefind)', async () => {
    //   // @ts-ignore
    //   const { nodes, edges } = await getNodesAndEdges({ id: 'Checkout', version: '0.0.1' });

    //   const expectedNodes = [
    //     {
    //       id: 'PlaceOrder-1.7.7',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode: 'simple', message: { ...mockCommands[2].data } },
    //       position: { x: expect.any(Number), y: expect.any(Number) },
    //       type: 'commands',
    //     },
    //     {
    //       id: 'OrderService-1.0.0',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: {
    //         mode: 'simple',
    //         service: { ...mockServices[2].data },
    //       },
    //       position: expect.anything(),
    //       type: 'services',
    //     },
    //     {
    //       id: 'OrderPlaced-0.0.1',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode: 'simple', message: { ...mockEvents[0].data } },
    //       position: expect.anything(),
    //       type: 'events',
    //     },
    //     /** PAYMENT SERVICE */
    //     {
    //       id: 'PaymentService-0.0.1',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: {
    //         mode: 'simple',
    //         service: { ...mockServices[3].data },
    //       },
    //       position: expect.anything(),
    //       type: 'services',
    //     },
    //     {
    //       id: 'PaymentPaid-0.0.1',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode: 'simple', message: { ...mockEvents[1].data } },
    //       position: expect.anything(),
    //       type: 'events',
    //     },
    //     {
    //       id: 'PaymentPaid-0.0.2',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode: 'simple', message: { ...mockEvents[2].data } },
    //       position: expect.anything(),
    //       type: 'events',
    //     },
    //     {
    //       id: 'PaymentRefunded-1.0.0',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode: 'simple', message: { ...mockEvents[4].data } },
    //       position: expect.anything(),
    //       type: 'events',
    //     },
    //     {
    //       id: 'PaymentFailed-1.0.0',
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode: 'simple', message: { ...mockEvents[6].data } },
    //       position: expect.anything(),
    //       type: 'events',
    //     },
    //   ];

    //   expect(nodes).toStrictEqual(expect.arrayContaining(expectedNodes.map((n) => expect.objectContaining(n))));
    // });
  });
});
