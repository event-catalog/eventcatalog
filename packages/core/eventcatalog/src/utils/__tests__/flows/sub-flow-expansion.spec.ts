import { expect, describe, it, vi } from 'vitest';
import { mockFlowsWithSubFlow, mockFlowsWithCycle, mockFlowsNested } from './mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: string) => {
      if (key === 'flows') {
        // @ts-expect-error runtime swap via globalThis
        return Promise.resolve(globalThis.__flowsMock ?? []);
      }
      return Promise.resolve([]);
    },
  };
});

// Import after vi.mock so the module picks up the mocked astro:content
const { getNodesAndEdges } = await import('../../node-graphs/flows-node-graph');

const withFlowsMock = async (mock: any[], run: () => Promise<void>) => {
  // @ts-expect-error test shim
  globalThis.__flowsMock = mock;
  try {
    await run();
  } finally {
    // @ts-expect-error test shim
    delete globalThis.__flowsMock;
  }
};

describe('Flows NodeGraph — sub-flow expansion precompute', () => {
  it('attaches expandedNodes and expandedEdges to a step that references another flow', async () => {
    await withFlowsMock(mockFlowsWithSubFlow, async () => {
      const { nodes } = await getNodesAndEdges({ id: 'ParentFlow', version: '1.0.0' });

      const subNode = nodes.find((n: any) => n.id === 'step-sub');
      expect(subNode).toBeDefined();
      expect(subNode?.type).toBe('flows');
      expect(Array.isArray(subNode?.data.expandedNodes)).toBe(true);
      expect(Array.isArray(subNode?.data.expandedEdges)).toBe(true);
      expect(subNode?.data.expandedNodes.length).toBe(2);
      expect(subNode?.data.expandedEdges.length).toBe(1);
    });
  });

  it('namespaces child node ids with the parent step node id', async () => {
    await withFlowsMock(mockFlowsWithSubFlow, async () => {
      const { nodes } = await getNodesAndEdges({ id: 'ParentFlow', version: '1.0.0' });

      const subNode = nodes.find((n: any) => n.id === 'step-sub');
      const childIds = subNode?.data.expandedNodes.map((n: any) => n.id);
      expect(childIds).toEqual(expect.arrayContaining(['step-sub__step-inner_1', 'step-sub__step-inner_2']));
    });
  });

  it('namespaces expanded edges to reference the child node ids', async () => {
    await withFlowsMock(mockFlowsWithSubFlow, async () => {
      const { nodes } = await getNodesAndEdges({ id: 'ParentFlow', version: '1.0.0' });

      const subNode = nodes.find((n: any) => n.id === 'step-sub');
      const edge = subNode?.data.expandedEdges[0];
      expect(edge.source).toBe('step-sub__step-inner_1');
      expect(edge.target).toBe('step-sub__step-inner_2');
    });
  });

  it('prefixes nested expandedNodes recursively so deep sub-flows get unique ids', async () => {
    await withFlowsMock(mockFlowsNested, async () => {
      const { nodes } = await getNodesAndEdges({ id: 'OuterFlow', version: '1.0.0' });

      const middleRef = nodes.find((n: any) => n.id === 'step-outer_mid');
      expect(middleRef).toBeDefined();

      const middleChild = middleRef?.data.expandedNodes[0];
      expect(middleChild.id).toBe('step-outer_mid__step-middle_leaf');

      // The leaf sub-flow's expansion payload, nested inside MiddleFlow, must
      // also carry the outer prefix so its ids stay unique across parents.
      const leafChildren = middleChild.data.expandedNodes;
      const leafIds = leafChildren.map((c: any) => c.id);
      expect(leafIds).toEqual(
        expect.arrayContaining([
          'step-outer_mid__step-middle_leaf__step-leaf_step_1',
          'step-outer_mid__step-middle_leaf__step-leaf_step_2',
        ])
      );
      const leafEdges = middleChild.data.expandedEdges;
      expect(leafEdges[0].source).toBe('step-outer_mid__step-middle_leaf__step-leaf_step_1');
      expect(leafEdges[0].target).toBe('step-outer_mid__step-middle_leaf__step-leaf_step_2');
    });
  });

  it('does not infinitely recurse on flow cycles (A → B → A)', async () => {
    await withFlowsMock(mockFlowsWithCycle, async () => {
      const { nodes } = await getNodesAndEdges({ id: 'FlowA', version: '1.0.0' });

      const callB = nodes.find((n: any) => n.id === 'step-a_call_b');
      expect(callB).toBeDefined();
      // FlowA → FlowB is expanded (one level deep)
      expect(Array.isArray(callB?.data.expandedNodes)).toBe(true);
      expect(callB?.data.expandedNodes.length).toBe(1);

      // The nested FlowB → FlowA reference must not re-expand (it's in visited)
      const innerCallA = callB?.data.expandedNodes[0];
      expect(innerCallA.id).toBe('step-a_call_b__step-b_call_a');
      expect(innerCallA.data.expandedNodes).toBeUndefined();
    });
  });
});
