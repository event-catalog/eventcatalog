import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';
import type { CatalogGraphNode } from '../types';

const CATALOG_PATH = path.join(__dirname, 'catalog-graph-messages-channels');

const { getGraph, writeAdr, writeChannel, writeCommand, writeEvent, writeQuery } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

const expectEventChildren = async (relationships: Partial<Parameters<typeof writeEvent>[0]>, children: CatalogGraphNode[]) => {
  await writeEvent({
    id: 'root-event',
    name: 'Root Event',
    version: '1.0.0',
    markdown: '# Root Event',
    ...relationships,
  });

  const graph = await getGraph({ type: 'event', id: 'root-event' }, { depth: 1 });
  expect(graph).toEqual({
    root: { type: 'event', id: 'root-event', version: '1.0.0', children },
  });
};

const expectCommandChildren = async (
  relationships: Partial<Parameters<typeof writeCommand>[0]>,
  children: CatalogGraphNode[]
) => {
  await writeCommand({
    id: 'root-command',
    name: 'Root Command',
    version: '1.0.0',
    markdown: '# Root Command',
    ...relationships,
  });

  const graph = await getGraph({ type: 'command', id: 'root-command' }, { depth: 1 });
  expect(graph).toEqual({
    root: { type: 'command', id: 'root-command', version: '1.0.0', children },
  });
};

const expectQueryChildren = async (relationships: Partial<Parameters<typeof writeQuery>[0]>, children: CatalogGraphNode[]) => {
  await writeQuery({
    id: 'root-query',
    name: 'Root Query',
    version: '1.0.0',
    markdown: '# Root Query',
    ...relationships,
  });

  const graph = await getGraph({ type: 'query', id: 'root-query' }, { depth: 1 });
  expect(graph).toEqual({
    root: { type: 'query', id: 'root-query', version: '1.0.0', children },
  });
};

const expectChannelChildren = async (
  relationships: Partial<Parameters<typeof writeChannel>[0]>,
  children: CatalogGraphNode[]
) => {
  await writeChannel({
    id: 'root-channel',
    name: 'Root Channel',
    version: '1.0.0',
    markdown: '# Root Channel',
    ...relationships,
  });

  const graph = await getGraph({ type: 'channel', id: 'root-channel' }, { depth: 1 });
  expect(graph).toEqual({
    root: { type: 'channel', id: 'root-channel', version: '1.0.0', children },
  });
};

describe('Event graphs', () => {
  it('includes channels', async () => {
    await writeChannel({ id: 'event-channel', name: 'Event Channel', version: '1.0.0', markdown: '# Event Channel' });

    await expectEventChildren({ channels: [{ id: 'event-channel' }] }, [
      { type: 'channel', id: 'event-channel', version: '1.0.0', children: [] },
    ]);
  });

  it('includes ADRs that apply to the event', async () => {
    await writeAdr({
      id: 'event-adr',
      name: 'Event ADR',
      version: '1.0.0',
      markdown: '# Event ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'event', id: 'root-event' }],
    });

    await expectEventChildren({}, [{ type: 'adr', id: 'event-adr', version: '1.0.0', children: [] }]);
  });

  it('traverses channel routes when depth is omitted', async () => {
    await writeChannel({ id: 'routed-channel', name: 'Routed Channel', version: '1.0.0', markdown: '# Routed Channel' });
    await writeChannel({
      id: 'event-channel',
      name: 'Event Channel',
      version: '1.0.0',
      markdown: '# Event Channel',
      routes: [{ id: 'routed-channel' }],
    });
    await writeEvent({
      id: 'root-event',
      name: 'Root Event',
      version: '1.0.0',
      markdown: '# Root Event',
      channels: [{ id: 'event-channel' }],
    });

    const graph = await getGraph({ type: 'event', id: 'root-event' });

    expect(graph).toEqual({
      root: {
        type: 'event',
        id: 'root-event',
        version: '1.0.0',
        children: [
          {
            type: 'channel',
            id: 'event-channel',
            version: '1.0.0',
            children: [{ type: 'channel', id: 'routed-channel', version: '1.0.0', children: [] }],
          },
        ],
      },
    });
  });

  it('does not create children for operation metadata', async () => {
    await expectEventChildren({ operation: { method: 'POST', path: '/orders' } }, []);
  });
});

describe('Command graphs', () => {
  it('includes channels', async () => {
    await writeChannel({ id: 'command-channel', name: 'Command Channel', version: '1.0.0', markdown: '# Command Channel' });

    await expectCommandChildren({ channels: [{ id: 'command-channel' }] }, [
      { type: 'channel', id: 'command-channel', version: '1.0.0', children: [] },
    ]);
  });

  it('includes ADRs that apply to the command', async () => {
    await writeAdr({
      id: 'command-adr',
      name: 'Command ADR',
      version: '1.0.0',
      markdown: '# Command ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'command', id: 'root-command' }],
    });

    await expectCommandChildren({}, [{ type: 'adr', id: 'command-adr', version: '1.0.0', children: [] }]);
  });

  it('does not create children for operation metadata', async () => {
    await expectCommandChildren({ operation: { method: 'POST', path: '/orders' } }, []);
  });
});

describe('Query graphs', () => {
  it('includes channels', async () => {
    await writeChannel({ id: 'query-channel', name: 'Query Channel', version: '1.0.0', markdown: '# Query Channel' });

    await expectQueryChildren({ channels: [{ id: 'query-channel' }] }, [
      { type: 'channel', id: 'query-channel', version: '1.0.0', children: [] },
    ]);
  });

  it('includes ADRs that apply to the query', async () => {
    await writeAdr({
      id: 'query-adr',
      name: 'Query ADR',
      version: '1.0.0',
      markdown: '# Query ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'query', id: 'root-query' }],
    });

    await expectQueryChildren({}, [{ type: 'adr', id: 'query-adr', version: '1.0.0', children: [] }]);
  });

  it('does not create children for operation metadata', async () => {
    await expectQueryChildren({ operation: { method: 'GET', path: '/orders' } }, []);
  });
});

describe('Channel graphs', () => {
  it('includes routed channels', async () => {
    await writeChannel({ id: 'routed-channel', name: 'Routed Channel', version: '1.0.0', markdown: '# Routed Channel' });

    await expectChannelChildren({ routes: [{ id: 'routed-channel' }] }, [
      { type: 'channel', id: 'routed-channel', version: '1.0.0', children: [] },
    ]);
  });

  it('includes ADRs that apply to the channel', async () => {
    await writeAdr({
      id: 'channel-adr',
      name: 'Channel ADR',
      version: '1.0.0',
      markdown: '# Channel ADR',
      status: 'accepted',
      date: '2026-07-20',
      appliesTo: [{ type: 'channel', id: 'root-channel' }],
    });

    await expectChannelChildren({}, [{ type: 'adr', id: 'channel-adr', version: '1.0.0', children: [] }]);
  });

  it('does not create children for protocol and delivery metadata', async () => {
    await expectChannelChildren(
      {
        address: 'orders',
        protocols: ['kafka'],
        deliveryGuarantee: 'at-least-once',
      },
      []
    );
  });
});
