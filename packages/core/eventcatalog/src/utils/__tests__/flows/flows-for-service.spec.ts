import { describe, expect, it } from 'vitest';
import { getFlowsWithServiceStep } from '@utils/collections/flows';

const service = (id: string, version: string) => ({ collection: 'services', data: { id, version } }) as any;
const flow = (id: string, steps: any[]) => ({ collection: 'flows', data: { id, version: '1.0.0', steps } });

const checkoutV1 = service('checkout-api', '1.0.0');
const checkoutV2 = service('checkout-api', '2.0.0');
const services = [checkoutV1, checkoutV2, service('payments-api', '1.0.0')];

describe('getFlowsWithServiceStep', () => {
  it('finds the flows with a step that points at the service version', () => {
    const flows = [
      flow('place-order', [{ id: 'checkout', title: 'Checkout', service: { id: 'checkout-api', version: '1.0.0' } }]),
      flow('refund', [{ id: 'refund', title: 'Refund', service: { id: 'payments-api', version: '1.0.0' } }]),
    ];

    expect(getFlowsWithServiceStep(checkoutV1, flows as any, services as any).map((f) => f.data.id)).toEqual(['place-order']);
  });

  it('treats a step without a version as pointing at the latest service version', () => {
    const flows = [flow('place-order', [{ id: 'checkout', title: 'Checkout', service: { id: 'checkout-api' } }])];

    expect(getFlowsWithServiceStep(checkoutV2, flows as any, services as any).map((f) => f.data.id)).toEqual(['place-order']);
    expect(getFlowsWithServiceStep(checkoutV1, flows as any, services as any)).toEqual([]);
  });

  it('ignores steps that do not point at a service', () => {
    const flows = [flow('notify', [{ id: 'email', title: 'Send email' }])];

    expect(getFlowsWithServiceStep(checkoutV1, flows as any, services as any)).toEqual([]);
  });
});
