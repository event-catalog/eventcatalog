import { getCollection } from 'astro:content';
import type { CollectionKey } from 'astro:content';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getNodesAndEdges } from '../../node-graphs/agents-node-graph';
import { mockAgents, mockChannels, mockCommands, mockContainers, mockEvents, mockQueries, mockServices } from '../services/mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: vi.fn(),
  };
});

describe('Agents NodeGraph', () => {
  beforeEach(() => {
    vi.mocked(getCollection).mockImplementation(((key: CollectionKey) => {
      switch (key) {
        case 'agents':
          return Promise.resolve(mockAgents);
        case 'services':
          return Promise.resolve(mockServices);
        case 'channels':
          return Promise.resolve(mockChannels);
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
    }) as any);
  });

  it('returns nodes and edges for a given agent', async () => {
    const { nodes, edges } = await getNodesAndEdges({ id: 'OrderSupportAgent', version: '1.0.0' });

    expect(nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'OrderSupportAgent-1.0.0',
          type: 'agents',
          data: expect.objectContaining({
            mode: 'simple',
            agent: expect.objectContaining({
              id: 'OrderSupportAgent',
              model: {
                provider: 'OpenAI',
                name: 'gpt-4.1-mini',
                version: '2025-04-14',
              },
            }),
          }),
          position: { x: expect.any(Number), y: expect.any(Number) },
        }),
        expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          type: 'commands',
          data: expect.objectContaining({ message: expect.objectContaining({ id: 'PaymentProcessed' }) }),
        }),
        expect.objectContaining({
          id: 'OrderCreatedEvent-0.0.1',
          type: 'events',
          data: expect.objectContaining({ message: expect.objectContaining({ id: 'OrderCreatedEvent' }) }),
        }),
        expect.objectContaining({
          id: 'OrderDatabase-1.0.0',
          type: 'data',
        }),
        expect.objectContaining({
          id: 'PaymentDatabase-1.0.0',
          type: 'data',
        }),
        expect.objectContaining({
          id: 'OrderSupportAgent-1.0.0-tool-order-history-lookup-mcp',
          type: 'agentTool',
          data: expect.objectContaining({
            mode: 'simple',
            agentTool: expect.objectContaining({
              name: 'Order history lookup',
              type: 'mcp',
              icon: '/icons/tools/snowflake.svg',
              url: 'https://mcp.example.com/orders/history',
              description: 'Retrieves the customer order timeline for support investigations.',
            }),
          }),
        }),
      ])
    );

    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'PaymentProcessed-0.0.1-OrderSupportAgent-1.0.0-warning',
          source: 'PaymentProcessed-0.0.1',
          target: 'OrderSupportAgent-1.0.0',
        }),
        expect.objectContaining({
          id: 'OrderSupportAgent-1.0.0-OrderCreatedEvent-0.0.1',
          source: 'OrderSupportAgent-1.0.0',
          target: 'OrderCreatedEvent-0.0.1',
        }),
        expect.objectContaining({
          id: 'OrderSupportAgent-1.0.0-OrderDatabase-1.0.0',
          source: 'OrderSupportAgent-1.0.0',
          target: 'OrderDatabase-1.0.0',
        }),
        expect.objectContaining({
          id: 'OrderSupportAgent-1.0.0-OrderSupportAgent-1.0.0-tool-order-history-lookup-mcp',
          source: 'OrderSupportAgent-1.0.0',
          target: 'OrderSupportAgent-1.0.0-tool-order-history-lookup-mcp',
          label: 'calls tool',
          type: 'step',
        }),
      ])
    );
  });

  it('returns empty nodes and edges if no agent is found', async () => {
    const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownAgent', version: '1.0.0' });

    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });
});
