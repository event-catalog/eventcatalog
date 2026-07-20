import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';
import type { CatalogGraphNode } from '../types';

const CATALOG_PATH = path.join(__dirname, 'catalog-graph');

const {
  getGraph,
  versionDomain,
  writeAdr,
  writeAgent,
  writeChannel,
  writeCommand,
  writeDataProduct,
  writeDataStore,
  writeDomain,
  writeEntity,
  writeEvent,
  writeFlow,
  writeQuery,
  writeService,
  writeSystem,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

const writeCatalog = async () => {
  await writeDomain({
    id: 'payments',
    name: 'Payments',
    version: '1.0.0',
    markdown: '# Payments v1',
  });
  await versionDomain('payments');
  await writeDomain({
    id: 'payments',
    name: 'Payments',
    version: '2.0.0',
    markdown: '# Payments v2',
    domains: [{ id: 'fraud' }],
    systems: [{ id: 'payment-system' }],
    entities: [{ id: 'payment' }],
    flows: [{ id: 'payment-flow' }],
    dataProducts: [{ id: 'payment-data-product' }],
  });
  await writeDomain({
    id: 'fraud',
    name: 'Fraud',
    version: '1.0.0',
    markdown: '# Fraud',
    agents: [{ id: 'fraud-agent' }],
  });
  await writeSystem({
    id: 'payment-system',
    name: 'Payment System',
    version: '1.0.0',
    markdown: '# Payment System',
    services: [{ id: 'payment-service' }],
    flows: [{ id: 'payment-flow' }],
    entities: [{ id: 'payment' }],
    containers: [{ id: 'payment-db' }],
  });
  await writeService({
    id: 'payment-service',
    name: 'Payment Service',
    version: '1.0.0',
    markdown: '# Payment Service',
    sends: [{ id: 'payment-created', version: '1.0.0' }],
    receives: [{ id: 'request-payment', version: '1.0.0' }],
    writesTo: [{ id: 'payment-db' }],
  });
  await writeAgent({
    id: 'fraud-agent',
    name: 'Fraud Agent',
    version: '1.0.0',
    markdown: '# Fraud Agent',
    receives: [{ id: 'payment-created', version: '1.0.0' }],
    sends: [{ id: 'get-risk', version: '1.0.0' }],
  });
  await writeEvent({
    id: 'payment-created',
    name: 'Payment Created',
    version: '1.0.0',
    markdown: '# Payment Created',
    channels: [{ id: 'payments-topic' }],
  });
  await writeCommand({
    id: 'request-payment',
    name: 'Request Payment',
    version: '1.0.0',
    markdown: '# Request Payment',
  });
  await writeQuery({
    id: 'get-risk',
    name: 'Get Risk',
    version: '1.0.0',
    markdown: '# Get Risk',
  });
  await writeChannel({
    id: 'payments-topic',
    name: 'Payments Topic',
    version: '1.0.0',
    markdown: '# Payments Topic',
  });
  await writeEntity({
    id: 'payment',
    name: 'Payment',
    version: '1.0.0',
    markdown: '# Payment',
  });
  await writeDataStore({
    id: 'payment-db',
    name: 'Payment Database',
    version: '1.0.0',
    markdown: '# Payment Database',
    container_type: 'database',
  });
  await writeFlow({
    id: 'payment-flow',
    name: 'Payment Flow',
    version: '1.0.0',
    markdown: '# Payment Flow',
    steps: [],
  });
  await writeDataProduct({
    id: 'payment-data-product',
    name: 'Payment Data Product',
    version: '1.0.0',
    markdown: '# Payment Data Product',
    inputs: [{ id: 'payment-created' }],
    outputs: [{ id: 'payment-db' }],
  });
  await writeAdr({
    id: 'payments-adr',
    name: 'Payments ADR',
    version: '1.0.0',
    markdown: '# Payments ADR',
    status: 'accepted',
    date: '2026-07-15',
    appliesTo: [{ type: 'service', id: 'payment-service' }],
  });

  await writeDomain({
    id: 'ordering',
    name: 'Ordering',
    version: '1.0.0',
    markdown: '# Ordering',
    services: [{ id: 'ordering-service' }],
  });
  await writeService({
    id: 'ordering-service',
    name: 'Ordering Service',
    version: '1.0.0',
    markdown: '# Ordering Service',
    receives: [{ id: 'payment-created' }],
  });
  await writeAdr({
    id: 'ordering-adr',
    name: 'Ordering ADR',
    version: '1.0.0',
    markdown: '# Ordering ADR',
    status: 'accepted',
    date: '2026-07-15',
    appliesTo: [{ type: 'service', id: 'ordering-service' }],
  });
};

const expectDomainChildren = async (relationships: Partial<Parameters<typeof writeDomain>[0]>, children: CatalogGraphNode[]) => {
  await writeDomain({
    id: 'root-domain',
    name: 'Root Domain',
    version: '1.0.0',
    markdown: '# Root Domain',
    ...relationships,
  });

  const graph = await getGraph({ type: 'domain', id: 'root-domain' }, { depth: 1 });

  expect(graph).toEqual({
    root: {
      type: 'domain',
      id: 'root-domain',
      version: '1.0.0',
      children,
    },
  });
};

const expectSystemChildren = async (relationships: Partial<Parameters<typeof writeSystem>[0]>, children: CatalogGraphNode[]) => {
  await writeSystem({
    id: 'root-system',
    name: 'Root System',
    version: '1.0.0',
    markdown: '# Root System',
    ...relationships,
  });

  const graph = await getGraph({ type: 'system', id: 'root-system' }, { depth: 1 });

  expect(graph).toEqual({
    root: {
      type: 'system',
      id: 'root-system',
      version: '1.0.0',
      children,
    },
  });
};

describe('Graph SDK', () => {
  describe('Domain graphs', () => {
    it('includes subdomains', async () => {
      await writeDomain({
        id: 'child-domain',
        name: 'Child Domain',
        version: '1.0.0',
        markdown: '# Child Domain',
      });

      await expectDomainChildren({ domains: [{ id: 'child-domain' }] }, [
        { type: 'domain', id: 'child-domain', version: '1.0.0', children: [] },
      ]);
    });

    it('includes systems', async () => {
      await writeSystem({
        id: 'domain-system',
        name: 'Domain System',
        version: '1.0.0',
        markdown: '# Domain System',
      });

      await expectDomainChildren({ systems: [{ id: 'domain-system' }] }, [
        { type: 'system', id: 'domain-system', version: '1.0.0', children: [] },
      ]);
    });

    it('includes services', async () => {
      await writeService({
        id: 'domain-service',
        name: 'Domain Service',
        version: '1.0.0',
        markdown: '# Domain Service',
      });

      await expectDomainChildren({ services: [{ id: 'domain-service' }] }, [
        { type: 'service', id: 'domain-service', version: '1.0.0', children: [] },
      ]);
    });

    it('includes agents', async () => {
      await writeAgent({
        id: 'domain-agent',
        name: 'Domain Agent',
        version: '1.0.0',
        markdown: '# Domain Agent',
      });

      await expectDomainChildren({ agents: [{ id: 'domain-agent' }] }, [
        { type: 'agent', id: 'domain-agent', version: '1.0.0', children: [] },
      ]);
    });

    it('includes entities', async () => {
      await writeEntity({
        id: 'domain-entity',
        name: 'Domain Entity',
        version: '1.0.0',
        markdown: '# Domain Entity',
      });

      await expectDomainChildren({ entities: [{ id: 'domain-entity' }] }, [
        { type: 'entity', id: 'domain-entity', version: '1.0.0', children: [] },
      ]);
    });

    it('includes data products', async () => {
      await writeDataProduct({
        id: 'domain-data-product',
        name: 'Domain Data Product',
        version: '1.0.0',
        markdown: '# Domain Data Product',
      });

      await expectDomainChildren({ dataProducts: [{ id: 'domain-data-product' }] }, [
        { type: 'data-product', id: 'domain-data-product', version: '1.0.0', children: [] },
      ]);
    });

    it('includes flows', async () => {
      await writeFlow({
        id: 'domain-flow',
        name: 'Domain Flow',
        version: '1.0.0',
        markdown: '# Domain Flow',
        steps: [],
      });

      await expectDomainChildren({ flows: [{ id: 'domain-flow' }] }, [
        { type: 'flow', id: 'domain-flow', version: '1.0.0', children: [] },
      ]);
    });

    it('includes events, commands, and queries from sends and receives', async () => {
      await writeEvent({
        id: 'domain-event',
        name: 'Domain Event',
        version: '1.0.0',
        markdown: '# Domain Event',
      });
      await writeCommand({
        id: 'domain-command',
        name: 'Domain Command',
        version: '1.0.0',
        markdown: '# Domain Command',
      });
      await writeQuery({
        id: 'domain-query',
        name: 'Domain Query',
        version: '1.0.0',
        markdown: '# Domain Query',
      });

      await expectDomainChildren(
        {
          sends: [{ id: 'domain-event' }, { id: 'domain-query' }],
          receives: [{ id: 'domain-command' }],
        },
        [
          { type: 'event', id: 'domain-event', version: '1.0.0', children: [] },
          { type: 'command', id: 'domain-command', version: '1.0.0', children: [] },
          { type: 'query', id: 'domain-query', version: '1.0.0', children: [] },
        ]
      );
    });

    it('includes ADRs that apply to the domain', async () => {
      await writeAdr({
        id: 'domain-adr',
        name: 'Domain ADR',
        version: '1.0.0',
        markdown: '# Domain ADR',
        status: 'accepted',
        date: '2026-07-20',
        appliesTo: [{ type: 'domain', id: 'root-domain' }],
      });

      await expectDomainChildren({}, [{ type: 'adr', id: 'domain-adr', version: '1.0.0', children: [] }]);
    });

    it('traverses the complete reachable domain graph when depth is omitted', async () => {
      await writeDomain({
        id: 'level-three',
        name: 'Level Three',
        version: '1.0.0',
        markdown: '# Level Three',
      });
      await writeDomain({
        id: 'level-two',
        name: 'Level Two',
        version: '1.0.0',
        markdown: '# Level Two',
        domains: [{ id: 'level-three' }],
      });
      await writeDomain({
        id: 'level-one',
        name: 'Level One',
        version: '1.0.0',
        markdown: '# Level One',
        domains: [{ id: 'level-two' }],
      });

      const graph = await getGraph({ type: 'domain', id: 'level-one' });

      expect(graph).toEqual({
        root: {
          type: 'domain',
          id: 'level-one',
          version: '1.0.0',
          children: [
            {
              type: 'domain',
              id: 'level-two',
              version: '1.0.0',
              children: [{ type: 'domain', id: 'level-three', version: '1.0.0', children: [] }],
            },
          ],
        },
      });
    });

    it('stops after one relationship level when depth is one', async () => {
      await writeDomain({
        id: 'level-two',
        name: 'Level Two',
        version: '1.0.0',
        markdown: '# Level Two',
      });
      await writeDomain({
        id: 'level-one',
        name: 'Level One',
        version: '1.0.0',
        markdown: '# Level One',
        domains: [{ id: 'level-two' }],
      });

      const graph = await getGraph({ type: 'domain', id: 'level-one' }, { depth: 1 });

      expect(graph).toEqual({
        root: {
          type: 'domain',
          id: 'level-one',
          version: '1.0.0',
          children: [{ type: 'domain', id: 'level-two', version: '1.0.0', children: [] }],
        },
      });
    });

    it('stops after two relationship levels when depth is two', async () => {
      await writeDomain({
        id: 'level-three',
        name: 'Level Three',
        version: '1.0.0',
        markdown: '# Level Three',
      });
      await writeDomain({
        id: 'level-two',
        name: 'Level Two',
        version: '1.0.0',
        markdown: '# Level Two',
        domains: [{ id: 'level-three' }],
      });
      await writeDomain({
        id: 'level-one',
        name: 'Level One',
        version: '1.0.0',
        markdown: '# Level One',
        domains: [{ id: 'level-two' }],
      });

      const graph = await getGraph({ type: 'domain', id: 'level-one' }, { depth: 2 });

      expect(graph).toEqual({
        root: {
          type: 'domain',
          id: 'level-one',
          version: '1.0.0',
          children: [
            {
              type: 'domain',
              id: 'level-two',
              version: '1.0.0',
              children: [{ type: 'domain', id: 'level-three', version: '1.0.0', children: [] }],
            },
          ],
        },
      });
    });
  });

  describe('System graphs', () => {
    it('includes related systems', async () => {
      await writeSystem({
        id: 'related-system',
        name: 'Related System',
        version: '1.0.0',
        markdown: '# Related System',
      });

      await expectSystemChildren({ relationships: [{ id: 'related-system' }] }, [
        { type: 'system', id: 'related-system', version: '1.0.0', children: [] },
      ]);
    });

    it('includes services', async () => {
      await writeService({
        id: 'system-service',
        name: 'System Service',
        version: '1.0.0',
        markdown: '# System Service',
      });

      await expectSystemChildren({ services: [{ id: 'system-service' }] }, [
        { type: 'service', id: 'system-service', version: '1.0.0', children: [] },
      ]);
    });

    it('includes flows', async () => {
      await writeFlow({
        id: 'system-flow',
        name: 'System Flow',
        version: '1.0.0',
        markdown: '# System Flow',
        steps: [],
      });

      await expectSystemChildren({ flows: [{ id: 'system-flow' }] }, [
        { type: 'flow', id: 'system-flow', version: '1.0.0', children: [] },
      ]);
    });

    it('includes entities', async () => {
      await writeEntity({
        id: 'system-entity',
        name: 'System Entity',
        version: '1.0.0',
        markdown: '# System Entity',
      });

      await expectSystemChildren({ entities: [{ id: 'system-entity' }] }, [
        { type: 'entity', id: 'system-entity', version: '1.0.0', children: [] },
      ]);
    });

    it('includes containers', async () => {
      await writeDataStore({
        id: 'system-container',
        name: 'System Container',
        version: '1.0.0',
        markdown: '# System Container',
        container_type: 'database',
      });

      await expectSystemChildren({ containers: [{ id: 'system-container' }] }, [
        { type: 'container', id: 'system-container', version: '1.0.0', children: [] },
      ]);
    });

    it('includes ADRs that apply to the system', async () => {
      await writeAdr({
        id: 'system-adr',
        name: 'System ADR',
        version: '1.0.0',
        markdown: '# System ADR',
        status: 'accepted',
        date: '2026-07-20',
        appliesTo: [{ type: 'system', id: 'root-system' }],
      });

      await expectSystemChildren({}, [{ type: 'adr', id: 'system-adr', version: '1.0.0', children: [] }]);
    });

    it('does not include actors because they are not catalog resources', async () => {
      await expectSystemChildren(
        {
          actors: [{ id: 'customer', name: 'Customer', direction: 'inbound' }],
        },
        []
      );
    });

    it('traverses the complete reachable system graph when depth is omitted', async () => {
      await writeChannel({
        id: 'system-channel',
        name: 'System Channel',
        version: '1.0.0',
        markdown: '# System Channel',
      });
      await writeEvent({
        id: 'system-event',
        name: 'System Event',
        version: '1.0.0',
        markdown: '# System Event',
        channels: [{ id: 'system-channel' }],
      });
      await writeService({
        id: 'system-service',
        name: 'System Service',
        version: '1.0.0',
        markdown: '# System Service',
        sends: [{ id: 'system-event' }],
      });
      await writeSystem({
        id: 'root-system',
        name: 'Root System',
        version: '1.0.0',
        markdown: '# Root System',
        services: [{ id: 'system-service' }],
      });

      const graph = await getGraph({ type: 'system', id: 'root-system' });

      expect(graph).toEqual({
        root: {
          type: 'system',
          id: 'root-system',
          version: '1.0.0',
          children: [
            {
              type: 'service',
              id: 'system-service',
              version: '1.0.0',
              children: [
                {
                  type: 'event',
                  id: 'system-event',
                  version: '1.0.0',
                  children: [{ type: 'channel', id: 'system-channel', version: '1.0.0', children: [] }],
                },
              ],
            },
          ],
        },
      });
    });

    it('stops after one relationship level when depth is one', async () => {
      await writeEvent({
        id: 'system-event',
        name: 'System Event',
        version: '1.0.0',
        markdown: '# System Event',
      });
      await writeService({
        id: 'system-service',
        name: 'System Service',
        version: '1.0.0',
        markdown: '# System Service',
        sends: [{ id: 'system-event' }],
      });
      await writeSystem({
        id: 'root-system',
        name: 'Root System',
        version: '1.0.0',
        markdown: '# Root System',
        services: [{ id: 'system-service' }],
      });

      const graph = await getGraph({ type: 'system', id: 'root-system' }, { depth: 1 });

      expect(graph).toEqual({
        root: {
          type: 'system',
          id: 'root-system',
          version: '1.0.0',
          children: [{ type: 'service', id: 'system-service', version: '1.0.0', children: [] }],
        },
      });
    });

    it('stops after two relationship levels when depth is two', async () => {
      await writeChannel({
        id: 'system-channel',
        name: 'System Channel',
        version: '1.0.0',
        markdown: '# System Channel',
      });
      await writeEvent({
        id: 'system-event',
        name: 'System Event',
        version: '1.0.0',
        markdown: '# System Event',
        channels: [{ id: 'system-channel' }],
      });
      await writeService({
        id: 'system-service',
        name: 'System Service',
        version: '1.0.0',
        markdown: '# System Service',
        sends: [{ id: 'system-event' }],
      });
      await writeSystem({
        id: 'root-system',
        name: 'Root System',
        version: '1.0.0',
        markdown: '# Root System',
        services: [{ id: 'system-service' }],
      });

      const graph = await getGraph({ type: 'system', id: 'root-system' }, { depth: 2 });

      expect(graph).toEqual({
        root: {
          type: 'system',
          id: 'root-system',
          version: '1.0.0',
          children: [
            {
              type: 'service',
              id: 'system-service',
              version: '1.0.0',
              children: [{ type: 'event', id: 'system-event', version: '1.0.0', children: [] }],
            },
          ],
        },
      });
    });
  });

  it('when depth is one, the latest resource and one level of children are returned as a nested graph', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'domain', id: 'payments' }, { depth: 1 });

    expect(graph).toEqual({
      root: {
        type: 'domain',
        id: 'payments',
        version: '2.0.0',
        children: [
          { type: 'domain', id: 'fraud', version: '1.0.0', children: [] },
          { type: 'system', id: 'payment-system', version: '1.0.0', children: [] },
          { type: 'entity', id: 'payment', version: '1.0.0', children: [] },
          { type: 'data-product', id: 'payment-data-product', version: '1.0.0', children: [] },
          { type: 'flow', id: 'payment-flow', version: '1.0.0', children: [] },
        ],
      },
    });
  });

  it('when depth is increased, the children of children are traversed', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'domain', id: 'payments' }, { depth: 2 });

    expect(graph).toEqual({
      root: {
        type: 'domain',
        id: 'payments',
        version: '2.0.0',
        children: [
          {
            type: 'domain',
            id: 'fraud',
            version: '1.0.0',
            children: [{ type: 'agent', id: 'fraud-agent', version: '1.0.0', children: [] }],
          },
          {
            type: 'system',
            id: 'payment-system',
            version: '1.0.0',
            children: [
              { type: 'service', id: 'payment-service', version: '1.0.0', children: [] },
              { type: 'entity', id: 'payment', version: '1.0.0', children: [] },
              { type: 'container', id: 'payment-db', version: '1.0.0', children: [] },
              { type: 'flow', id: 'payment-flow', version: '1.0.0', children: [] },
            ],
          },
          { type: 'entity', id: 'payment', version: '1.0.0', children: [] },
          {
            type: 'data-product',
            id: 'payment-data-product',
            version: '1.0.0',
            children: [
              { type: 'event', id: 'payment-created', version: '1.0.0', children: [] },
              { type: 'container', id: 'payment-db', version: '1.0.0', children: [] },
            ],
          },
          { type: 'flow', id: 'payment-flow', version: '1.0.0', children: [] },
        ],
      },
    });
  });

  it('when flat is true, all resources within the requested depth are returned once', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'domain', id: 'payments' }, { depth: 3, flat: true });

    expect(graph).toEqual({
      root: { type: 'domain', id: 'payments', version: '2.0.0' },
      resources: [
        { type: 'domain', id: 'payments', version: '2.0.0' },
        { type: 'domain', id: 'fraud', version: '1.0.0' },
        { type: 'system', id: 'payment-system', version: '1.0.0' },
        { type: 'service', id: 'payment-service', version: '1.0.0' },
        { type: 'agent', id: 'fraud-agent', version: '1.0.0' },
        { type: 'event', id: 'payment-created', version: '1.0.0' },
        { type: 'command', id: 'request-payment', version: '1.0.0' },
        { type: 'query', id: 'get-risk', version: '1.0.0' },
        { type: 'channel', id: 'payments-topic', version: '1.0.0' },
        { type: 'entity', id: 'payment', version: '1.0.0' },
        { type: 'container', id: 'payment-db', version: '1.0.0' },
        { type: 'data-product', id: 'payment-data-product', version: '1.0.0' },
        { type: 'flow', id: 'payment-flow', version: '1.0.0' },
        { type: 'adr', id: 'payments-adr', version: '1.0.0' },
      ],
    });
  });

  it('when a flat graph has many converging paths, each reachable resource is expanded once', async () => {
    const layerCount = 14;

    for (let layer = layerCount; layer >= 1; layer--) {
      const children = layer === layerCount ? [] : [{ id: `domain-${layer + 1}-a` }, { id: `domain-${layer + 1}-b` }];

      await writeDomain({
        id: `domain-${layer}-a`,
        name: `Domain ${layer} A`,
        version: '1.0.0',
        markdown: `# Domain ${layer} A`,
        domains: children,
      });
      await writeDomain({
        id: `domain-${layer}-b`,
        name: `Domain ${layer} B`,
        version: '1.0.0',
        markdown: `# Domain ${layer} B`,
        domains: children,
      });
    }

    await writeDomain({
      id: 'root-domain',
      name: 'Root Domain',
      version: '1.0.0',
      markdown: '# Root Domain',
      domains: [{ id: 'domain-1-a' }, { id: 'domain-1-b' }],
    });

    const graph = await getGraph({ type: 'domain', id: 'root-domain' }, { flat: true });

    expect(graph?.resources).toHaveLength(1 + layerCount * 2);
    expect(new Set(graph?.resources.map((resource) => `${resource.type}:${resource.id}:${resource.version}`)).size).toBe(
      1 + layerCount * 2
    );
  });

  it('when depth is zero, only the requested version of the root is returned', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'domain', id: 'payments', version: '1.0.0' }, { depth: 0 });

    expect(graph).toEqual({
      root: { type: 'domain', id: 'payments', version: '1.0.0', children: [] },
    });
  });

  it('when a non-domain resource is the root, its relationships are traversed', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'service', id: 'payment-service' }, { depth: 1 });

    expect(graph).toEqual({
      root: {
        type: 'service',
        id: 'payment-service',
        version: '1.0.0',
        children: [
          { type: 'event', id: 'payment-created', version: '1.0.0', children: [] },
          { type: 'command', id: 'request-payment', version: '1.0.0', children: [] },
          { type: 'container', id: 'payment-db', version: '1.0.0', children: [] },
          { type: 'adr', id: 'payments-adr', version: '1.0.0', children: [] },
        ],
      },
    });
  });

  it('when resources contain circular references, traversal stops at the cycle', async () => {
    await writeDomain({
      id: 'domain-a',
      name: 'Domain A',
      version: '1.0.0',
      markdown: '# Domain A',
      domains: [{ id: 'domain-b' }],
    });
    await writeDomain({
      id: 'domain-b',
      name: 'Domain B',
      version: '1.0.0',
      markdown: '# Domain B',
      domains: [{ id: 'domain-a' }],
    });

    const graph = await getGraph({ type: 'domain', id: 'domain-a' }, { depth: 3 });

    expect(graph).toEqual({
      root: {
        type: 'domain',
        id: 'domain-a',
        version: '1.0.0',
        children: [
          {
            type: 'domain',
            id: 'domain-b',
            version: '1.0.0',
            children: [{ type: 'domain', id: 'domain-a', version: '1.0.0', children: [] }],
          },
        ],
      },
    });
  });

  it('when depth is invalid, an error is thrown', async () => {
    await expect(getGraph({ type: 'domain', id: 'payments' }, { depth: -1 })).rejects.toThrowError(
      'Graph depth must be a non-negative integer'
    );
  });

  it('when the requested graph root does not exist, undefined is returned', async () => {
    const graph = await getGraph({ type: 'domain', id: 'missing-domain' });

    expect(graph).toEqual(undefined);
  });
});
