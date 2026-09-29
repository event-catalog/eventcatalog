import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { getNodesAndEdges } from '@utils/node-graphs/flows-node-graph';

const flow = (id: string, steps: any[]) => ({
  id: `${id}/index.mdx`,
  collection: 'flows',
  data: { id, name: id, version: '1.0.0', steps },
});

const flows = [
  flow('ChannelFlow', [
    { id: 'checkout', service: { id: 'CheckoutService', version: 'latest' }, next_step: 'orders-topic' },
    { id: 'orders-topic', channel: { id: 'orders', version: '1.0.0' } },
  ]),
  flow('UntitledSteps', [
    { id: 'checkout', service: { id: 'CheckoutService', version: 'latest' } },
    { id: 'shopper', actor: { name: 'Shopper' } },
    { id: 'stripe', externalSystem: { name: 'Stripe' } },
    { id: 'done', custom: { title: 'Order placed' } },
    { id: 'just-a-box' },
    { id: 'named', title: 'My own title', service: { id: 'CheckoutService', version: 'latest' } },
    { id: 'both', title: 'Step title', custom: { title: 'Custom title' } },
  ]),
  flow('TypoFlow', [
    { id: 'start', title: 'Start', next_steps: ['checkout', 'typo'] },
    { id: 'checkout', title: 'Checkout' },
  ]),
  flow('MissingResourceFlow', [{ id: 'checkout', title: 'Checkout', service: { id: 'MissingService', version: 'latest' } }]),
  flow('DrawnTwice', [{ id: 'start', title: 'Start', next_step: 'nowhere' }]),
];

const collections: Record<string, any[]> = {
  flows,
  services: [{ collection: 'services', data: { id: 'CheckoutService', name: 'Checkout Service', version: '1.0.0' } }],
  channels: [{ collection: 'channels', data: { id: 'orders', name: 'Orders Topic', version: '1.0.0' } }],
};

vi.mock('astro:content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('astro:content')>()),
  getCollection: (key: string) => Promise.resolve(collections[key] ?? []),
}));

describe('flow steps', () => {
  let warn: MockInstance;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('renders a step that references a channel as a channel node with a docs link', async () => {
    const { nodes, edges } = await getNodesAndEdges({ id: 'ChannelFlow', version: '1.0.0', layout: false });
    const channel = nodes.find((node: any) => node.id === 'step-orders-topic');

    expect(channel?.type).toBe('channels');
    expect(channel?.data.channel).toEqual(expect.objectContaining({ id: 'orders', name: 'Orders Topic' }));
    expect(channel?.data.contextMenu).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: expect.stringContaining('/docs/channels/orders/1.0.0') })])
    );
    expect(edges.map((edge: any) => edge.target)).toEqual(['step-orders-topic']);
  });

  it('titles a step without a title after what it points at, or its id when it points at nothing', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'UntitledSteps', version: '1.0.0', layout: false });
    const titles = Object.fromEntries(nodes.map((node: any) => [node.id, node.data.step.title]));

    expect(titles).toEqual({
      'step-checkout': 'Checkout Service',
      'step-shopper': 'Shopper',
      'step-stripe': 'Stripe',
      'step-done': 'Order placed',
      'step-just-a-box': 'just-a-box',
      'step-named': 'My own title',
      // As the custom node itself is labelled
      'step-both': 'Custom title',
    });
  });

  it('warns about a next step that is not in the flow, and draws no arrow to it', async () => {
    const { edges } = await getNodesAndEdges({ id: 'TypoFlow', version: '1.0.0', layout: false });

    expect(edges.map((edge: any) => edge.target)).toEqual(['step-checkout']);
    expect(warn).toHaveBeenCalledWith(
      '[flows] Flow "TypoFlow" (1.0.0): step "start" leads to step "typo", but the flow has no step with that id.'
    );
  });

  it('warns about a step that points at something not in the catalog', async () => {
    await getNodesAndEdges({ id: 'MissingResourceFlow', version: '1.0.0', layout: false });

    expect(warn).toHaveBeenCalledWith(
      '[flows] Flow "MissingResourceFlow" (1.0.0): step "checkout" points at service "MissingService" (latest), which is not in the catalog, so it is shown as a plain step.'
    );
  });

  it('warns about each problem once, however often the flow is drawn', async () => {
    await getNodesAndEdges({ id: 'DrawnTwice', version: '1.0.0', layout: false });
    await getNodesAndEdges({ id: 'DrawnTwice', version: '1.0.0', layout: false });

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
