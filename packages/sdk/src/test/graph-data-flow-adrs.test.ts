import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';
import type { CatalogGraphNode } from '../types';

const CATALOG_PATH = path.join(__dirname, 'catalog-graph-data-flow-adrs');

const {
  getGraph,
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

const expectEntityChildren = async (relationships: Partial<Parameters<typeof writeEntity>[0]>, children: CatalogGraphNode[]) => {
  await writeEntity({
    id: 'root-entity',
    name: 'Root Entity',
    version: '1.0.0',
    markdown: '# Root Entity',
    ...relationships,
  });

  const graph = await getGraph({ type: 'entity', id: 'root-entity' }, { depth: 1 });
  expect(graph).toEqual({ root: { type: 'entity', id: 'root-entity', version: '1.0.0', children } });
};

const expectContainerChildren = async (
  relationships: Partial<Parameters<typeof writeDataStore>[0]>,
  children: CatalogGraphNode[]
) => {
  await writeDataStore({
    id: 'root-container',
    name: 'Root Container',
    version: '1.0.0',
    markdown: '# Root Container',
    container_type: 'database',
    ...relationships,
  });

  const graph = await getGraph({ type: 'container', id: 'root-container' }, { depth: 1 });
  expect(graph).toEqual({ root: { type: 'container', id: 'root-container', version: '1.0.0', children } });
};

const expectDataProductChildren = async (
  relationships: Partial<Parameters<typeof writeDataProduct>[0]>,
  children: CatalogGraphNode[]
) => {
  await writeDataProduct({
    id: 'root-data-product',
    name: 'Root Data Product',
    version: '1.0.0',
    markdown: '# Root Data Product',
    ...relationships,
  });

  const graph = await getGraph({ type: 'data-product', id: 'root-data-product' }, { depth: 1 });
  expect(graph).toEqual({ root: { type: 'data-product', id: 'root-data-product', version: '1.0.0', children } });
};

const expectFlowChildren = async (relationships: Partial<Parameters<typeof writeFlow>[0]>, children: CatalogGraphNode[]) => {
  await writeFlow({
    id: 'root-flow',
    name: 'Root Flow',
    version: '1.0.0',
    markdown: '# Root Flow',
    steps: [],
    ...relationships,
  });

  const graph = await getGraph({ type: 'flow', id: 'root-flow' }, { depth: 1 });
  expect(graph).toEqual({ root: { type: 'flow', id: 'root-flow', version: '1.0.0', children } });
};

const expectAdrChildren = async (relationships: Partial<Parameters<typeof writeAdr>[0]>, children: CatalogGraphNode[]) => {
  await writeAdr({
    id: 'root-adr',
    name: 'Root ADR',
    version: '1.0.0',
    markdown: '# Root ADR',
    status: 'accepted',
    date: '2026-07-20',
    ...relationships,
  });

  const graph = await getGraph({ type: 'adr', id: 'root-adr' }, { depth: 1 });
  expect(graph).toEqual({ root: { type: 'adr', id: 'root-adr', version: '1.0.0', children } });
};

describe('Entity graphs', () => {
  it('includes ADRs that apply to the entity', async () => {
    await writeAdr({
      id: 'entity-adr',
      name: 'Entity ADR',
      version: '1.0.0',
      markdown: '# Entity ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'entity', id: 'root-entity' }],
    });

    await expectEntityChildren({}, [{ type: 'adr', id: 'entity-adr', version: '1.0.0', children: [] }]);
  });

  it('does not create children for entity property metadata', async () => {
    await expectEntityChildren(
      {
        aggregateRoot: true,
        identifier: 'id',
        properties: [{ name: 'id', type: 'string', required: true }],
      },
      []
    );
  });
});

describe('Container graphs', () => {
  it('includes ADRs that apply to the container', async () => {
    await writeAdr({
      id: 'container-adr',
      name: 'Container ADR',
      version: '1.0.0',
      markdown: '# Container ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'container', id: 'root-container' }],
    });

    await expectContainerChildren({}, [{ type: 'adr', id: 'container-adr', version: '1.0.0', children: [] }]);
  });

  it('does not create children for storage metadata', async () => {
    await expectContainerChildren(
      {
        technology: 'PostgreSQL',
        authoritative: true,
        access_mode: 'read-write',
      },
      []
    );
  });
});

describe('Data product graphs', () => {
  it('includes supported resource types from inputs and outputs', async () => {
    await writeService({ id: 'input-service', name: 'Input Service', version: '1.0.0', markdown: '# Input Service' });
    await writeEvent({ id: 'input-event', name: 'Input Event', version: '1.0.0', markdown: '# Input Event' });
    await writeCommand({ id: 'input-command', name: 'Input Command', version: '1.0.0', markdown: '# Input Command' });
    await writeQuery({ id: 'input-query', name: 'Input Query', version: '1.0.0', markdown: '# Input Query' });
    await writeChannel({ id: 'input-channel', name: 'Input Channel', version: '1.0.0', markdown: '# Input Channel' });
    await writeDataStore({
      id: 'output-container',
      name: 'Output Container',
      version: '1.0.0',
      markdown: '# Output Container',
      container_type: 'database',
    });

    await expectDataProductChildren(
      {
        inputs: [
          { id: 'input-service' },
          { id: 'input-event' },
          { id: 'input-command' },
          { id: 'input-query' },
          { id: 'input-channel' },
        ],
        outputs: [{ id: 'output-container' }],
      },
      [
        { type: 'service', id: 'input-service', version: '1.0.0', children: [] },
        { type: 'event', id: 'input-event', version: '1.0.0', children: [] },
        { type: 'command', id: 'input-command', version: '1.0.0', children: [] },
        { type: 'query', id: 'input-query', version: '1.0.0', children: [] },
        { type: 'channel', id: 'input-channel', version: '1.0.0', children: [] },
        { type: 'container', id: 'output-container', version: '1.0.0', children: [] },
      ]
    );
  });

  it('uses an explicit pointer type when resource ids collide', async () => {
    await writeEvent({ id: 'shared-id', name: 'Shared Event', version: '1.0.0', markdown: '# Shared Event' });
    await writeService({ id: 'shared-id', name: 'Shared Service', version: '1.0.0', markdown: '# Shared Service' });

    await expectDataProductChildren({ inputs: [{ type: 'event', id: 'shared-id' }] }, [
      { type: 'event', id: 'shared-id', version: '1.0.0', children: [] },
    ]);
  });

  it('includes ADRs that apply to the data product', async () => {
    await writeAdr({
      id: 'data-product-adr',
      name: 'Data Product ADR',
      version: '1.0.0',
      markdown: '# Data Product ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'data-product', id: 'root-data-product' }],
    });

    await expectDataProductChildren({}, [{ type: 'adr', id: 'data-product-adr', version: '1.0.0', children: [] }]);
  });
});

describe('Flow graphs', () => {
  it('includes every catalog resource referenced by flow steps', async () => {
    await writeService({ id: 'flow-service', name: 'Flow Service', version: '1.0.0', markdown: '# Flow Service' });
    await writeAgent({ id: 'flow-agent', name: 'Flow Agent', version: '1.0.0', markdown: '# Flow Agent' });
    await writeEvent({ id: 'flow-event', name: 'Flow Event', version: '1.0.0', markdown: '# Flow Event' });
    await writeCommand({ id: 'flow-command', name: 'Flow Command', version: '1.0.0', markdown: '# Flow Command' });
    await writeQuery({ id: 'flow-query', name: 'Flow Query', version: '1.0.0', markdown: '# Flow Query' });
    await writeDataStore({
      id: 'flow-container',
      name: 'Flow Container',
      version: '1.0.0',
      markdown: '# Flow Container',
      container_type: 'database',
    });
    await writeDataProduct({
      id: 'flow-data-product',
      name: 'Flow Data Product',
      version: '1.0.0',
      markdown: '# Flow Data Product',
    });
    await writeFlow({ id: 'child-flow', name: 'Child Flow', version: '1.0.0', markdown: '# Child Flow', steps: [] });

    await expectFlowChildren(
      {
        steps: [
          { id: 1, title: 'Service', service: { id: 'flow-service' } },
          { id: 2, title: 'Agent', agent: { id: 'flow-agent' } },
          { id: 3, title: 'Event', message: { id: 'flow-event' } },
          { id: 4, title: 'Command', message: { id: 'flow-command' } },
          { id: 5, title: 'Query', message: { id: 'flow-query' } },
          { id: 6, title: 'Container', container: { id: 'flow-container' } },
          { id: 7, title: 'Data Product', dataProduct: { id: 'flow-data-product' } },
          { id: 8, title: 'Flow', flow: { id: 'child-flow' } },
        ],
      },
      [
        { type: 'service', id: 'flow-service', version: '1.0.0', children: [] },
        { type: 'agent', id: 'flow-agent', version: '1.0.0', children: [] },
        { type: 'event', id: 'flow-event', version: '1.0.0', children: [] },
        { type: 'command', id: 'flow-command', version: '1.0.0', children: [] },
        { type: 'query', id: 'flow-query', version: '1.0.0', children: [] },
        { type: 'container', id: 'flow-container', version: '1.0.0', children: [] },
        { type: 'data-product', id: 'flow-data-product', version: '1.0.0', children: [] },
        { type: 'flow', id: 'child-flow', version: '1.0.0', children: [] },
      ]
    );
  });

  it('does not include actor, custom, or external-system steps because they are not catalog resources', async () => {
    await expectFlowChildren(
      {
        steps: [
          { id: 1, title: 'Actor', actor: { name: 'Customer' } },
          { id: 2, title: 'Custom', custom: { title: 'Custom Node' } },
          { id: 3, title: 'External', externalSystem: { name: 'External System' } },
        ],
      },
      []
    );
  });

  it('includes ADRs that apply to the flow', async () => {
    await writeAdr({
      id: 'flow-adr',
      name: 'Flow ADR',
      version: '1.0.0',
      markdown: '# Flow ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'flow', id: 'root-flow' }],
    });

    await expectFlowChildren({}, [{ type: 'adr', id: 'flow-adr', version: '1.0.0', children: [] }]);
  });
});

describe('ADR graphs', () => {
  it('includes every supported resource type from appliesTo', async () => {
    await writeDomain({ id: 'adr-domain', name: 'ADR Domain', version: '1.0.0', markdown: '# ADR Domain' });
    await writeSystem({ id: 'adr-system', name: 'ADR System', version: '1.0.0', markdown: '# ADR System' });
    await writeService({ id: 'adr-service', name: 'ADR Service', version: '1.0.0', markdown: '# ADR Service' });
    await writeAgent({ id: 'adr-agent', name: 'ADR Agent', version: '1.0.0', markdown: '# ADR Agent' });
    await writeEvent({ id: 'adr-event', name: 'ADR Event', version: '1.0.0', markdown: '# ADR Event' });
    await writeCommand({ id: 'adr-command', name: 'ADR Command', version: '1.0.0', markdown: '# ADR Command' });
    await writeQuery({ id: 'adr-query', name: 'ADR Query', version: '1.0.0', markdown: '# ADR Query' });
    await writeChannel({ id: 'adr-channel', name: 'ADR Channel', version: '1.0.0', markdown: '# ADR Channel' });
    await writeEntity({ id: 'adr-entity', name: 'ADR Entity', version: '1.0.0', markdown: '# ADR Entity' });
    await writeDataStore({
      id: 'adr-container',
      name: 'ADR Container',
      version: '1.0.0',
      markdown: '# ADR Container',
      container_type: 'database',
    });
    await writeDataProduct({
      id: 'adr-data-product',
      name: 'ADR Data Product',
      version: '1.0.0',
      markdown: '# ADR Data Product',
    });
    await writeFlow({ id: 'adr-flow', name: 'ADR Flow', version: '1.0.0', markdown: '# ADR Flow', steps: [] });

    await expectAdrChildren(
      {
        appliesTo: [
          { type: 'domain', id: 'adr-domain' },
          { type: 'system', id: 'adr-system' },
          { type: 'service', id: 'adr-service' },
          { type: 'agent', id: 'adr-agent' },
          { type: 'event', id: 'adr-event' },
          { type: 'command', id: 'adr-command' },
          { type: 'query', id: 'adr-query' },
          { type: 'channel', id: 'adr-channel' },
          { type: 'entity', id: 'adr-entity' },
          { type: 'container', id: 'adr-container' },
          { type: 'data-product', id: 'adr-data-product' },
          { type: 'flow', id: 'adr-flow' },
        ],
      },
      [
        { type: 'domain', id: 'adr-domain', version: '1.0.0', children: [] },
        { type: 'system', id: 'adr-system', version: '1.0.0', children: [] },
        { type: 'service', id: 'adr-service', version: '1.0.0', children: [] },
        { type: 'agent', id: 'adr-agent', version: '1.0.0', children: [] },
        { type: 'event', id: 'adr-event', version: '1.0.0', children: [] },
        { type: 'command', id: 'adr-command', version: '1.0.0', children: [] },
        { type: 'query', id: 'adr-query', version: '1.0.0', children: [] },
        { type: 'channel', id: 'adr-channel', version: '1.0.0', children: [] },
        { type: 'entity', id: 'adr-entity', version: '1.0.0', children: [] },
        { type: 'container', id: 'adr-container', version: '1.0.0', children: [] },
        { type: 'data-product', id: 'adr-data-product', version: '1.0.0', children: [] },
        { type: 'flow', id: 'adr-flow', version: '1.0.0', children: [] },
      ]
    );
  });

  it('includes supersedes, supersededBy, amends, amendedBy, and related ADRs', async () => {
    const relatedAdrs = [
      ['supersedes-adr', 'Supersedes ADR'],
      ['superseded-by-adr', 'Superseded By ADR'],
      ['amends-adr', 'Amends ADR'],
      ['amended-by-adr', 'Amended By ADR'],
      ['related-adr', 'Related ADR'],
    ] as const;

    for (const [id, name] of relatedAdrs) {
      await writeAdr({ id, name, version: '1.0.0', markdown: `# ${name}`, status: 'accepted', date: '2026-07-20' });
    }

    await expectAdrChildren(
      {
        supersedes: [{ id: 'supersedes-adr' }],
        supersededBy: [{ id: 'superseded-by-adr' }],
        amends: [{ id: 'amends-adr' }],
        amendedBy: [{ id: 'amended-by-adr' }],
        related: [{ id: 'related-adr' }],
      },
      [
        { type: 'adr', id: 'amended-by-adr', version: '1.0.0', children: [] },
        { type: 'adr', id: 'amends-adr', version: '1.0.0', children: [] },
        { type: 'adr', id: 'related-adr', version: '1.0.0', children: [] },
        { type: 'adr', id: 'superseded-by-adr', version: '1.0.0', children: [] },
        { type: 'adr', id: 'supersedes-adr', version: '1.0.0', children: [] },
      ]
    );
  });

  it('does not include appliesTo targets outside the supported graph resource types', async () => {
    await writeEvent({
      id: 'adr-user',
      name: 'Resource With User Id',
      version: '1.0.0',
      markdown: '# Resource With User Id',
    });

    await expectAdrChildren(
      {
        appliesTo: [
          { type: 'user', id: 'adr-user' },
          { type: 'team', id: 'adr-team' },
          { type: 'diagram', id: 'adr-diagram' },
        ],
      },
      []
    );
  });
});
