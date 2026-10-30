import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getNodesAndEdges } from '@utils/node-graphs/system-levels-node-graph';

const entry = (collection: string, id: string, data: Record<string, any> = {}) => ({
  id: `${collection}/${id}`,
  collection,
  data: { id, name: id, version: '1.0.0', ...data },
});

// orders-api (in the orders system) sends OrderPlaced. support-agent is in no
// system, receives it, and has two tools.
const ordersApi = entry('services', 'orders-api', { sends: [{ id: 'OrderPlaced', version: '1.0.0' }] });
const supportAgent = entry('agents', 'support-agent', {
  receives: [{ id: 'OrderPlaced', version: '1.0.0' }],
  tools: [
    { name: 'Web Search', type: 'function' },
    { name: 'Get Current Date', type: 'function' },
  ],
});
const ordersSystem = entry('systems', 'orders-system', {
  name: 'Orders',
  services: [{ id: 'orders-api', version: '1.0.0' }],
});

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'systems':
          return Promise.resolve([ordersSystem]);
        case 'services':
          return Promise.resolve([ordersApi]);
        case 'agents':
          return Promise.resolve([supportAgent]);
        case 'events':
          return Promise.resolve([entry('events', 'OrderPlaced')]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

const group = 'system-group-orders-system-1.0.0';
const toolIds = ['support-agent-1.0.0-tool-web-search-function', 'support-agent-1.0.0-tool-get-current-date-function'];
const node = (nodes: any[], id: string) => nodes.find((item) => item.id === id);

describe('System diagram agent tools', () => {
  it("leaves an outside agent's tools off the diagram, with the agent outside the system group", async () => {
    const { nodes, hiddenMessages } = await getNodesAndEdges({ id: 'orders-system', version: '1.0.0' });

    expect(node(nodes, 'orders-api-1.0.0')?.parentId).toBe(group);
    expect(node(nodes, 'support-agent-1.0.0')?.parentId).toBeUndefined();

    for (const graph of [nodes, hiddenMessages.nodes]) {
      expect(node(graph, 'support-agent-1.0.0')).toBeDefined();
      for (const toolId of toolIds) expect(node(graph, toolId)).toBeUndefined();
    }
  });
});
