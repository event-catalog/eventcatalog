import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';
import type { CatalogGraphNode } from '../types';

const CATALOG_PATH = path.join(__dirname, 'catalog-graph-services-agents');

const {
  getGraph,
  writeAdr,
  writeAgent,
  writeCommand,
  writeDataStore,
  writeEntity,
  writeEvent,
  writeFlow,
  writeQuery,
  writeService,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

const expectServiceChildren = async (
  relationships: Partial<Parameters<typeof writeService>[0]>,
  children: CatalogGraphNode[]
) => {
  await writeService({
    id: 'root-service',
    name: 'Root Service',
    version: '1.0.0',
    markdown: '# Root Service',
    ...relationships,
  });

  const graph = await getGraph({ type: 'service', id: 'root-service' }, { depth: 1 });

  expect(graph).toEqual({
    root: {
      type: 'service',
      id: 'root-service',
      version: '1.0.0',
      children,
    },
  });
};

const expectAgentChildren = async (relationships: Partial<Parameters<typeof writeAgent>[0]>, children: CatalogGraphNode[]) => {
  await writeAgent({
    id: 'root-agent',
    name: 'Root Agent',
    version: '1.0.0',
    markdown: '# Root Agent',
    ...relationships,
  });

  const graph = await getGraph({ type: 'agent', id: 'root-agent' }, { depth: 1 });

  expect(graph).toEqual({
    root: {
      type: 'agent',
      id: 'root-agent',
      version: '1.0.0',
      children,
    },
  });
};

describe('Service graphs', () => {
  it('includes events, commands, and queries from sends and receives', async () => {
    await writeEvent({ id: 'service-event', name: 'Service Event', version: '1.0.0', markdown: '# Service Event' });
    await writeCommand({ id: 'service-command', name: 'Service Command', version: '1.0.0', markdown: '# Service Command' });
    await writeQuery({ id: 'service-query', name: 'Service Query', version: '1.0.0', markdown: '# Service Query' });

    await expectServiceChildren(
      {
        sends: [{ id: 'service-event' }, { id: 'service-query' }],
        receives: [{ id: 'service-command' }],
      },
      [
        { type: 'event', id: 'service-event', version: '1.0.0', children: [] },
        { type: 'command', id: 'service-command', version: '1.0.0', children: [] },
        { type: 'query', id: 'service-query', version: '1.0.0', children: [] },
      ]
    );
  });

  it('includes entities', async () => {
    await writeEntity({ id: 'service-entity', name: 'Service Entity', version: '1.0.0', markdown: '# Service Entity' });

    await expectServiceChildren({ entities: [{ id: 'service-entity' }] }, [
      { type: 'entity', id: 'service-entity', version: '1.0.0', children: [] },
    ]);
  });

  it('includes flows', async () => {
    await writeFlow({ id: 'service-flow', name: 'Service Flow', version: '1.0.0', markdown: '# Service Flow', steps: [] });

    await expectServiceChildren({ flows: [{ id: 'service-flow' }] }, [
      { type: 'flow', id: 'service-flow', version: '1.0.0', children: [] },
    ]);
  });

  it('includes containers from writesTo and readsFrom', async () => {
    await writeDataStore({
      id: 'service-read-db',
      name: 'Service Read Database',
      version: '1.0.0',
      markdown: '# Service Read Database',
      container_type: 'database',
    });
    await writeDataStore({
      id: 'service-write-db',
      name: 'Service Write Database',
      version: '1.0.0',
      markdown: '# Service Write Database',
      container_type: 'database',
    });

    await expectServiceChildren(
      {
        readsFrom: [{ id: 'service-read-db' }],
        writesTo: [{ id: 'service-write-db' }],
      },
      [
        { type: 'container', id: 'service-read-db', version: '1.0.0', children: [] },
        { type: 'container', id: 'service-write-db', version: '1.0.0', children: [] },
      ]
    );
  });

  it('includes ADRs that apply to the service', async () => {
    await writeAdr({
      id: 'service-adr',
      name: 'Service ADR',
      version: '1.0.0',
      markdown: '# Service ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'service', id: 'root-service' }],
    });

    await expectServiceChildren({}, [{ type: 'adr', id: 'service-adr', version: '1.0.0', children: [] }]);
  });

  it('traverses all service descendants when depth is omitted', async () => {
    const { writeChannel } = utils(CATALOG_PATH);
    await writeChannel({ id: 'service-channel', name: 'Service Channel', version: '1.0.0', markdown: '# Service Channel' });
    await writeEvent({
      id: 'service-event',
      name: 'Service Event',
      version: '1.0.0',
      markdown: '# Service Event',
      channels: [{ id: 'service-channel' }],
    });
    await writeService({
      id: 'root-service',
      name: 'Root Service',
      version: '1.0.0',
      markdown: '# Root Service',
      sends: [{ id: 'service-event' }],
    });

    const graph = await getGraph({ type: 'service', id: 'root-service' });

    expect(graph).toEqual({
      root: {
        type: 'service',
        id: 'root-service',
        version: '1.0.0',
        children: [
          {
            type: 'event',
            id: 'service-event',
            version: '1.0.0',
            children: [{ type: 'channel', id: 'service-channel', version: '1.0.0', children: [] }],
          },
        ],
      },
    });
  });

  it('does not create children for service metadata', async () => {
    await expectServiceChildren(
      {
        externalSystem: true,
        specifications: [{ type: 'openapi', path: 'openapi.yml' }],
      },
      []
    );
  });
});

describe('Agent graphs', () => {
  it('includes events, commands, and queries from sends and receives', async () => {
    await writeEvent({ id: 'agent-event', name: 'Agent Event', version: '1.0.0', markdown: '# Agent Event' });
    await writeCommand({ id: 'agent-command', name: 'Agent Command', version: '1.0.0', markdown: '# Agent Command' });
    await writeQuery({ id: 'agent-query', name: 'Agent Query', version: '1.0.0', markdown: '# Agent Query' });

    await expectAgentChildren(
      {
        sends: [{ id: 'agent-event' }, { id: 'agent-query' }],
        receives: [{ id: 'agent-command' }],
      },
      [
        { type: 'event', id: 'agent-event', version: '1.0.0', children: [] },
        { type: 'command', id: 'agent-command', version: '1.0.0', children: [] },
        { type: 'query', id: 'agent-query', version: '1.0.0', children: [] },
      ]
    );
  });

  it('includes flows', async () => {
    await writeFlow({ id: 'agent-flow', name: 'Agent Flow', version: '1.0.0', markdown: '# Agent Flow', steps: [] });

    await expectAgentChildren({ flows: [{ id: 'agent-flow' }] }, [
      { type: 'flow', id: 'agent-flow', version: '1.0.0', children: [] },
    ]);
  });

  it('includes containers from writesTo and readsFrom', async () => {
    await writeDataStore({
      id: 'agent-read-db',
      name: 'Agent Read Database',
      version: '1.0.0',
      markdown: '# Agent Read Database',
      container_type: 'database',
    });
    await writeDataStore({
      id: 'agent-write-db',
      name: 'Agent Write Database',
      version: '1.0.0',
      markdown: '# Agent Write Database',
      container_type: 'database',
    });

    await expectAgentChildren(
      {
        readsFrom: [{ id: 'agent-read-db' }],
        writesTo: [{ id: 'agent-write-db' }],
      },
      [
        { type: 'container', id: 'agent-read-db', version: '1.0.0', children: [] },
        { type: 'container', id: 'agent-write-db', version: '1.0.0', children: [] },
      ]
    );
  });

  it('includes ADRs that apply to the agent', async () => {
    await writeAdr({
      id: 'agent-adr',
      name: 'Agent ADR',
      version: '1.0.0',
      markdown: '# Agent ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'agent', id: 'root-agent' }],
    });

    await expectAgentChildren({}, [{ type: 'adr', id: 'agent-adr', version: '1.0.0', children: [] }]);
  });

  it('does not create children for model and tool metadata', async () => {
    await expectAgentChildren(
      {
        model: { provider: 'openai', name: 'gpt' },
        tools: [{ name: 'search', type: 'mcp' }],
      },
      []
    );
  });
});
