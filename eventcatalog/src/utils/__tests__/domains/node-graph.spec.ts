import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockDomains, mockServices, mockEvents, mockCommands, mockDataProducts, mockEntities } from './mocks';
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
        case 'data-products':
          return Promise.resolve(mockDataProducts);
        case 'entities':
          return Promise.resolve(mockEntities);
        case 'queries':
        case 'containers':
        case 'channels':
          return Promise.resolve([]);
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

      // 9 original nodes + 2 from data product (ShippingAnalytics + ShippingMetricsCalculated) + 1 entity (Shipment)
      expect(nodes.length).toEqual(14);
      // 8 original edges + 2 from data product (input edge + output edge) + 2 from entity (receives + sends)
      expect(edges.length).toEqual(14);
    });

    it('should return nodes and edges for data products in a domain', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'Shipping', version: '0.0.1' });

      // Expect the data product node to be rendered (no group property since it's the top-level domain)
      const expectedDataProductNode = {
        id: 'ShippingAnalytics-1.0.0',
        type: 'data-products',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({
          mode: 'simple',
          dataProduct: expect.objectContaining({
            id: 'ShippingAnalytics',
            version: '1.0.0',
          }),
        }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Expect the output event from the data product to be rendered
      const expectedOutputEventNode = {
        id: 'ShippingMetricsCalculated-1.0.0',
        type: 'events',
        data: expect.objectContaining({
          mode: 'simple',
          message: expect.objectContaining({
            id: 'ShippingMetricsCalculated',
            version: '1.0.0',
          }),
        }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining(expectedDataProductNode)]));
      expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining(expectedOutputEventNode)]));

      // Verify edges exist between data product and its inputs/outputs
      const dataProductInputEdge = edges.find(
        (e: any) => e.source === 'OrderPlaced-0.0.1' && e.target === 'ShippingAnalytics-1.0.0'
      );
      const dataProductOutputEdge = edges.find(
        (e: any) => e.source === 'ShippingAnalytics-1.0.0' && e.target === 'ShippingMetricsCalculated-1.0.0'
      );

      expect(dataProductInputEdge).toBeDefined();
      expect(dataProductOutputEdge).toBeDefined();
    });

    it('should return nodes and edges for entities in a domain', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'Shipping', version: '0.0.1' });

      // Expect the Shipment entity node to be rendered
      const expectedEntityNode = {
        id: 'Shipment-0.0.1',
        type: 'entities',
        data: expect.objectContaining({
          mode: 'simple',
          entity: expect.objectContaining({
            data: expect.objectContaining({
              id: 'Shipment',
              version: '0.0.1',
            }),
          }),
        }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining(expectedEntityNode)]));

      // Verify edges between entity and its messages
      // Entity receives OrderPlaced (incoming edge)
      const entityReceivesEdge = edges.find((e: any) => e.source === 'OrderPlaced-0.0.1' && e.target === 'Shipment-0.0.1');
      // Entity sends ShippingMetricsCalculated (outgoing edge)
      const entitySendsEdge = edges.find(
        (e: any) => e.source === 'Shipment-0.0.1' && e.target === 'ShippingMetricsCalculated-1.0.0'
      );

      expect(entityReceivesEdge).toBeDefined();
      expect(entityReceivesEdge.label).toBe('subscribes to');
      expect(entitySendsEdge).toBeDefined();
      expect(entitySendsEdge.label).toBe('emits');
    });

    it('should merge shared messages between entity and other resources', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'Shipping', version: '0.0.1' });

      // OrderPlaced is received by both LocationService and Shipment entity
      // There should be only one OrderPlaced node
      const orderPlacedNodes = nodes.filter((n: any) => n.id === 'OrderPlaced-0.0.1');
      expect(orderPlacedNodes.length).toBe(1);

      // But there should be edges from OrderPlaced to both LocationService and Shipment
      const edgesToLocationService = edges.find(
        (e: any) => e.source === 'OrderPlaced-0.0.1' && e.target === 'LocationService-0.0.1'
      );
      const edgesToShipment = edges.find((e: any) => e.source === 'OrderPlaced-0.0.1' && e.target === 'Shipment-0.0.1');

      expect(edgesToLocationService).toBeDefined();
      expect(edgesToShipment).toBeDefined();

      // ShippingMetricsCalculated is output by both DataProduct and Shipment entity
      // There should be only one ShippingMetricsCalculated node
      const shippingMetricsNodes = nodes.filter((n: any) => n.id === 'ShippingMetricsCalculated-1.0.0');
      expect(shippingMetricsNodes.length).toBe(1);
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
