import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { compactVisualiserGraph, compactVisualiserResource } from '@utils/node-graphs/compact-visualiser-graph';

const collectionEntry = (collection: string, data: Record<string, unknown>, extras: Record<string, unknown> = {}) => ({
  id: `${collection}/${data.id}`,
  collection,
  filePath: `domains/Example/${collection}/${data.id}/index.mdx`,
  digest: 'abc123',
  body: '# Markdown body that must never reach the client island\n'.repeat(20),
  rendered: { html: '<p>rendered</p>' },
  data,
  ...extras,
});

describe('compactVisualiserResource', () => {
  it('keeps the fields visualiser nodes render and drops catalog hydration weight', () => {
    const compacted = compactVisualiserResource(
      collectionEntry('events', {
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Fired when an order is created',
        owners: [{ id: 'ordering-platform', name: 'Ordering' }],
        schemaPath: 'schema.json',
        producers: [collectionEntry('services', { id: 'OrderService', version: '1.0.0', sends: [{ id: 'OrderCreated' }] })],
        consumers: [collectionEntry('services', { id: 'BillingService', version: '1.0.0' })],
        messageChannels: [{ id: 'orders' }],
      })
    );

    expect(compacted).toEqual({
      id: 'OrderCreated',
      collection: 'events',
      name: 'Order Created',
      version: '1.0.0',
      summary: 'Fired when an order is created',
      owners: [{ id: 'ordering-platform', name: 'Ordering' }],
      data: {
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Fired when an order is created',
        owners: [{ id: 'ordering-platform', name: 'Ordering' }],
      },
    });
    expect(JSON.stringify(compacted)).not.toContain('Markdown body');
    expect(JSON.stringify(compacted)).not.toContain('filePath');
    expect(JSON.stringify(compacted)).not.toContain('OrderService');
  });

  it('compacts domain services to the { data: { id, name, version } } shape Domain nodes read', () => {
    const compacted = compactVisualiserResource(
      collectionEntry('domains', {
        id: 'ordering',
        name: 'Ordering',
        version: '1.0.0',
        services: [
          collectionEntry('services', {
            id: 'OrderService',
            name: 'Order Service',
            version: '1.0.0',
            sends: [{ id: 'OrderCreated', version: '1.0.0' }],
            body: 'nope',
          }),
        ],
      })
    ) as { data: { services: Array<{ data: { id: string; name: string; version: string } }> } };

    expect(compacted.data.services).toEqual([
      {
        data: {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
        },
      },
    ]);
  });
});

describe('compactVisualiserGraph', () => {
  it('strips hydrated producers from message nodes and full services from edges', () => {
    const nodes: Node[] = [
      {
        id: 'OrderCreated-1.0.0',
        type: 'events',
        position: { x: 10, y: 20 },
        data: {
          mode: 'simple',
          isFocused: true,
          message: {
            id: 'OrderCreated',
            name: 'Order Created',
            version: '1.0.0',
            summary: 'Fired when an order is created',
            producers: [collectionEntry('services', { id: 'OrderService', version: '1.0.0', sends: [{ id: 'x' }] })],
            consumers: [collectionEntry('services', { id: 'BillingService', version: '1.0.0' })],
          },
          contextMenu: [{ label: 'Read documentation', href: '/docs/events/OrderCreated/1.0.0' }],
        },
      },
      {
        id: 'OrderService-1.0.0',
        type: 'services',
        position: { x: 0, y: 0 },
        data: {
          mode: 'simple',
          service: collectionEntry('services', {
            id: 'OrderService',
            name: 'Order Service',
            version: '1.0.0',
            summary: 'Orders',
            specifications: [{ type: 'asyncapi', path: 'asyncapi.yml' }],
            sends: [collectionEntry('events', { id: 'OrderCreated', version: '1.0.0', body: 'event body' })],
            receives: [],
          }),
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'OrderService-1.0.0',
        target: 'OrderCreated-1.0.0',
        label: 'publishes',
        data: {
          customColor: '#ff0000',
          rootSourceAndTarget: {
            source: collectionEntry('services', { id: 'OrderService', version: '1.0.0', name: 'Order Service' }),
            target: collectionEntry('events', { id: 'OrderCreated', version: '1.0.0', name: 'Order Created' }),
          },
          publisherService: collectionEntry('services', { id: 'OrderService', version: '1.0.0' }),
          message: {
            id: 'OrderCreated',
            name: 'Order Created',
            version: '1.0.0',
            producers: [collectionEntry('services', { id: 'OrderService', version: '1.0.0' })],
          },
        },
      },
    ];

    const { nodes: compactNodes, edges: compactEdges } = compactVisualiserGraph(nodes, edges);
    const serialized = JSON.stringify({ nodes: compactNodes, edges: compactEdges });

    expect(compactNodes[0].position).toEqual({ x: 10, y: 20 });
    expect(compactNodes[0].data).toMatchObject({
      mode: 'simple',
      isFocused: true,
      message: {
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Fired when an order is created',
      },
      contextMenu: [{ label: 'Read documentation', href: '/docs/events/OrderCreated/1.0.0' }],
    });
    expect((compactNodes[0].data as any).message.producers).toBeUndefined();
    expect((compactNodes[1].data as any).service).toMatchObject({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      summary: 'Orders',
      specifications: [{ type: 'asyncapi', path: 'asyncapi.yml' }],
    });
    expect((compactNodes[1].data as any).service.sends).toBeUndefined();

    expect(compactEdges[0].data).toMatchObject({
      customColor: '#ff0000',
      rootSourceAndTarget: {
        source: { id: 'services/OrderService', collection: 'services' },
        target: { id: 'events/OrderCreated', collection: 'events' },
      },
      message: {
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
      },
    });
    expect((compactEdges[0].data as any).publisherService).toBeUndefined();
    expect(serialized).not.toContain('Markdown body');
    expect(serialized).not.toContain('event body');
    expect(serialized.length).toBeLessThan(JSON.stringify({ nodes, edges }).length / 2);
  });

  it('compacts grouped messages without dropping group metadata', () => {
    const { nodes } = compactVisualiserGraph(
      [
        {
          id: 'group-sends',
          type: 'messageGroup',
          position: { x: 0, y: 0 },
          data: {
            groupName: 'Orders',
            direction: 'sends',
            messageCount: 1,
            messageTypes: ['events'],
            service: { id: 'OrderService', version: '1.0.0' },
            messages: [
              {
                message: collectionEntry('events', {
                  id: 'OrderCreated',
                  name: 'Order Created',
                  version: '1.0.0',
                  producers: [collectionEntry('services', { id: 'OrderService', version: '1.0.0' })],
                }),
                channels: [],
              },
            ],
          },
        },
      ],
      []
    );

    expect(nodes[0].data).toMatchObject({
      groupName: 'Orders',
      direction: 'sends',
      messageCount: 1,
      service: { id: 'OrderService', version: '1.0.0' },
    });
    expect((nodes[0].data as any).messages[0].message).toMatchObject({
      collection: 'events',
      name: 'Order Created',
      data: { id: 'OrderCreated', name: 'Order Created', version: '1.0.0' },
    });
    expect((nodes[0].data as any).messages[0].message.producers).toBeUndefined();
  });

  it('preserves entity properties and aggregateRoot so Entity nodes keep relationship handles', () => {
    const { nodes } = compactVisualiserGraph(
      [
        {
          id: 'Order-1.0.0',
          type: 'entities',
          position: { x: 0, y: 0 },
          data: {
            mode: 'full',
            entity: collectionEntry('entities', {
              id: 'Order',
              name: 'Order',
              version: '1.0.0',
              aggregateRoot: true,
              properties: [
                { name: 'id', type: 'string', required: true },
                {
                  name: 'customer',
                  type: 'Customer',
                  references: 'Customer',
                  referencesIdentifier: 'id',
                  relationType: 'hasOne',
                },
              ],
            }),
          },
        },
      ],
      []
    );

    const entity = (nodes[0].data as any).entity;
    expect(entity.data).toMatchObject({
      id: 'Order',
      name: 'Order',
      version: '1.0.0',
      aggregateRoot: true,
      properties: [
        { name: 'id', type: 'string', required: true },
        {
          name: 'customer',
          type: 'Customer',
          references: 'Customer',
          referencesIdentifier: 'id',
          relationType: 'hasOne',
        },
      ],
    });
    expect(entity.body).toBeUndefined();
    expect(entity.filePath).toBeUndefined();
    expect(JSON.stringify(entity)).not.toContain('Markdown body');
  });

  it('preserves flow sidebar.badge so Flow nodes keep their configured label', () => {
    const { nodes } = compactVisualiserGraph(
      [
        {
          id: 'PaymentFlow-1.0.0',
          type: 'flows',
          position: { x: 0, y: 0 },
          data: {
            mode: 'simple',
            label: undefined,
            flow: collectionEntry('flows', {
              id: 'PaymentFlow',
              name: 'Payment Flow',
              version: '1.0.0',
              sidebar: { badge: 'Subflow' },
            }),
          },
        },
      ],
      []
    );

    expect((nodes[0].data as any).flow.data.sidebar).toEqual({ badge: 'Subflow' });
    expect((nodes[0].data as any).flow.body).toBeUndefined();
    expect((nodes[0].data as any).flow.filePath).toBeUndefined();
  });
});
