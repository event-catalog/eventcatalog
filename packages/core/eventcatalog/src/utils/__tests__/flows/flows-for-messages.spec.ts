import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFlowsForMessages } from '@utils/collections/flows';

const fixtures = vi.hoisted(() => ({ flows: [] as any[] }));
vi.mock('astro:content', () => ({ getCollection: vi.fn(async () => fixtures.flows) }));

const message = (collection: string, id: string, version: string) => ({ collection, data: { id, version } });
const flow = (id: string, version: string, steps: any[], extra: Record<string, unknown> = {}) => ({
  collection: 'flows',
  data: { id, version, name: `${id} flow`, summary: `${id} summary`, steps, ...extra },
});

describe('getFlowsForMessages', () => {
  beforeEach(() => {
    fixtures.flows = [];
  });

  it('lists the flows whose steps send or receive each message version', async () => {
    fixtures.flows = [
      flow('Checkout', '1.0.0', [
        { id: 'start', title: 'Order created', message: { id: 'OrderCreated', version: '1.0.0' }, next_step: 'paid' },
        { id: 'paid', title: 'Payment taken', message: { id: 'PaymentTaken', version: '2.0.0' } },
      ]),
      flow('Refunds', '1.0.0', [{ id: 'start', title: 'Refund requested', message: { id: 'OrderCreated', version: '2.0.0' } }]),
    ];

    const flows = await getFlowsForMessages([
      message('events', 'OrderCreated', '1.0.0'),
      message('events', 'OrderCreated', '2.0.0'),
      message('events', 'PaymentTaken', '2.0.0'),
    ]);

    expect(flows.get('events:OrderCreated:1.0.0')).toEqual([
      { id: 'Checkout', version: '1.0.0', name: 'Checkout flow', summary: 'Checkout summary' },
    ]);
    expect(flows.get('events:OrderCreated:2.0.0')).toEqual([
      { id: 'Refunds', version: '1.0.0', name: 'Refunds flow', summary: 'Refunds summary' },
    ]);
    expect(flows.get('events:PaymentTaken:2.0.0')).toHaveLength(1);
  });

  it('resolves semver ranges and latest the same way flow diagrams do', async () => {
    fixtures.flows = [
      flow('Ranges', '1.0.0', [{ id: 'a', title: 'A', message: { id: 'OrderCreated', version: '^1.0.0' } }]),
      flow('Latest', '1.0.0', [{ id: 'a', title: 'A', message: { id: 'OrderCreated', version: 'latest' } }]),
      flow('Bare', '1.0.0', [{ id: 'a', title: 'A', message: { id: 'OrderCreated' } }]),
    ];

    const flows = await getFlowsForMessages([
      message('events', 'OrderCreated', '1.2.0'),
      message('events', 'OrderCreated', '2.0.0'),
    ]);

    expect(flows.get('events:OrderCreated:1.2.0')?.map((f) => f.id)).toEqual(['Ranges']);
    expect(flows.get('events:OrderCreated:2.0.0')?.map((f) => f.id)).toEqual(['Latest', 'Bare']);
  });

  it('lists a flow once per message and skips hidden flows and unknown messages', async () => {
    fixtures.flows = [
      flow('Twice', '1.0.0', [
        { id: 'a', title: 'A', message: { id: 'OrderCreated', version: '1.0.0' } },
        { id: 'b', title: 'B', message: { id: 'OrderCreated', version: '1.0.0' } },
        { id: 'c', title: 'C', message: { id: 'Unknown', version: '1.0.0' } },
        { id: 'd', title: 'D' },
      ]),
      flow('Hidden', '1.0.0', [{ id: 'a', title: 'A', message: { id: 'OrderCreated', version: '1.0.0' } }], { hidden: true }),
    ];

    const flows = await getFlowsForMessages([message('events', 'OrderCreated', '1.0.0')]);

    expect(flows.get('events:OrderCreated:1.0.0')?.map((f) => f.id)).toEqual(['Twice']);
    expect(flows.size).toBe(1);
  });

  it('omits name and summary when the flow has none', async () => {
    fixtures.flows = [
      {
        collection: 'flows',
        data: { id: 'Bare', version: '1.0.0', steps: [{ id: 'a', title: 'A', message: { id: 'M', version: '1.0.0' } }] },
      },
    ];

    expect((await getFlowsForMessages([message('commands', 'M', '1.0.0')])).get('commands:M:1.0.0')).toEqual([
      { id: 'Bare', version: '1.0.0' },
    ]);
  });
});
