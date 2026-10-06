import { describe, expect, it } from 'vitest';
import { getFlowStepResources } from '@utils/collections/flows';

const entry = (collection: string, id: string, version = '1.0.0') => ({ collection, data: { id, version } }) as any;

const checkoutApi = entry('services', 'checkout-api');
const checkoutApiV2 = entry('services', 'checkout-api', '2.0.0');
const paymentSaga = entry('flows', 'payment-saga');
const catalog = { services: [checkoutApi, checkoutApiV2], flows: [paymentSaga] };

describe('getFlowStepResources', () => {
  it('lists the catalog resources a flow steps through, in step order', () => {
    const placeOrder = {
      data: {
        id: 'place-order',
        version: '1.0.0',
        steps: [
          { id: 1, title: 'Customer', actor: { name: 'Customer' } },
          { id: 2, title: 'Checkout', service: { id: 'checkout-api', version: '1.0.0' } },
          { id: 3, title: 'Checkout cart', message: [entry('commands', 'checkout-cart')] },
          { id: 4, title: 'Fraud check', agent: [entry('agents', 'fraud-agent')] },
          { id: 5, title: 'Orders DB', container: [entry('containers', 'orders-db')] },
          { id: 6, title: 'Analytics', dataProduct: [entry('data-products', 'order-analytics')] },
          { id: 7, title: 'Take payment', flow: { id: 'payment-saga' } },
        ],
      },
    };

    expect(
      getFlowStepResources(placeOrder as any, catalog as any).map((r: any) => `${r.collection}:${r.data.id}:${r.data.version}`)
    ).toEqual([
      'services:checkout-api:1.0.0',
      'commands:checkout-cart:1.0.0',
      'agents:fraud-agent:1.0.0',
      'containers:orders-db:1.0.0',
      'data-products:order-analytics:1.0.0',
      'flows:payment-saga:1.0.0',
    ]);
  });

  it('resolves a service step without a version to the latest service', () => {
    const placeOrder = {
      data: { id: 'place-order', version: '1.0.0', steps: [{ id: 1, title: 'Checkout', service: { id: 'checkout-api' } }] },
    };

    expect(getFlowStepResources(placeOrder as any, catalog as any)).toEqual([checkoutApiV2]);
  });

  it('lists a resource used by several steps once', () => {
    const cart = entry('commands', 'checkout-cart');
    const placeOrder = {
      data: {
        id: 'place-order',
        version: '1.0.0',
        steps: [
          { id: 1, title: 'Send', message: [cart] },
          { id: 2, title: 'Retry', message: [cart] },
        ],
      },
    };

    expect(getFlowStepResources(placeOrder as any, catalog as any)).toEqual([cart]);
  });

  it('skips steps whose resource is not in the catalog', () => {
    const placeOrder = {
      data: {
        id: 'place-order',
        version: '1.0.0',
        steps: [
          { id: 1, title: 'Missing', service: { id: 'missing-service' } },
          { id: 2, title: 'Missing message', message: [] },
        ],
      },
    };

    expect(getFlowStepResources(placeOrder as any, catalog as any)).toEqual([]);
  });
});
