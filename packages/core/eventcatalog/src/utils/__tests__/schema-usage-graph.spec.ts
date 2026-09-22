import { describe, expect, it, vi } from 'vitest';
import { attachFlowGraphs, getFlowGraph } from '../schema-usage-graph';

const fixtures = vi.hoisted(() => ({ nodes: [] as any[], edges: [] as any[] }));
vi.mock('@config', () => ({ default: {} }));
vi.mock('@utils/node-graphs/message-node-graph', () => ({
  getNodesAndEdgesForEvents: vi.fn(),
  getNodesAndEdgesForCommands: vi.fn(),
  getNodesAndEdgesForQueries: vi.fn(),
}));
vi.mock('@utils/node-graphs/flows-node-graph', () => ({
  getNodesAndEdges: vi.fn(async () => ({ nodes: fixtures.nodes, edges: fixtures.edges })),
}));

const messageNode = (id: string, messageId: string, version: string) => ({
  id,
  type: 'events',
  position: { x: 0, y: 0 },
  data: { mode: 'simple', message: { id: messageId, version, collection: 'events', data: { id: messageId, version } } },
});

describe('getFlowGraph', () => {
  it('marks the steps for the focused message version as being viewed', async () => {
    fixtures.nodes = [
      messageNode('step-1', 'OrderCreated', '1.0.0'),
      messageNode('step-2', 'OrderCreated', '2.0.0'),
      messageNode('step-3', 'PaymentTaken', '1.0.0'),
      { id: 'step-4', type: 'step', position: { x: 0, y: 0 }, data: { mode: 'simple', step: { title: 'Manual check' } } },
    ];
    fixtures.edges = [{ id: 'e1', source: 'step-1', target: 'step-2' }];

    const graph = await getFlowGraph({ id: 'Checkout', version: '1.0.0', focus: { id: 'OrderCreated', version: '1.0.0' } });

    expect(graph.nodes.map((node) => [node.id, node.data.isFocused])).toEqual([
      ['step-1', true],
      ['step-2', undefined],
      ['step-3', undefined],
      ['step-4', undefined],
    ]);
    expect(graph.edges).toEqual(fixtures.edges);
  });

  it('highlights nothing without a focused message', async () => {
    fixtures.nodes = [messageNode('step-1', 'OrderCreated', '1.0.0')];
    fixtures.edges = [];

    const graph = await getFlowGraph({ id: 'Checkout', version: '1.0.0' });

    expect(graph.nodes[0].data.isFocused).toBeUndefined();
  });
});

describe('attachFlowGraphs', () => {
  it('adds a highlighted diagram to each flow and keeps flows whose diagram fails', async () => {
    fixtures.nodes = [messageNode('step-1', 'OrderCreated', '1.0.0')];
    fixtures.edges = [];
    const { getNodesAndEdges } = await import('@utils/node-graphs/flows-node-graph');
    vi.mocked(getNodesAndEdges).mockRejectedValueOnce(new Error('boom'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const flows = await attachFlowGraphs(
      [
        { id: 'Broken', version: '1.0.0' },
        { id: 'Checkout', version: '1.0.0' },
      ],
      { id: 'OrderCreated', version: '1.0.0' }
    );

    expect(flows[0]).toEqual({ id: 'Broken', version: '1.0.0' });
    expect(flows[1].graph?.nodes[0].data.isFocused).toBe(true);
    expect(log).toHaveBeenCalledWith('Error building flow graph for Broken:', expect.any(Error));
    log.mockRestore();
  });
});
