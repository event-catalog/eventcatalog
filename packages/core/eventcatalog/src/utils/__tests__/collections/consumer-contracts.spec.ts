import { describe, expect, it } from 'vitest';
import {
  getConsumerContractPath,
  getConsumerContractsForMessage,
  getConsumerContractsForResource,
} from '@utils/collections/consumer-contracts';

const createService = (receives: any[], overrides: Record<string, unknown> = {}) => ({
  collection: 'services',
  filePath: 'services/ShippingService/index.mdx',
  data: { id: 'ShippingService', name: 'Shipping Service', version: '1.0.0', receives },
  ...overrides,
});

const createMessage = (version = '1.0.0', latestVersion = '1.0.0') => ({
  data: { id: 'OrderPaid', version, latestVersion },
});

describe('getConsumerContractsForResource', () => {
  it('returns no contracts when none of the received messages has one', () => {
    expect(getConsumerContractsForResource(createService([{ id: 'OrderPaid', version: '1.0.0' }]))).toEqual([]);
  });

  it('returns the contract of a received message with its name, type and the message it is for', () => {
    const service = createService([
      {
        id: 'OrderPaid',
        version: '1.0.0',
        contract: { path: './contracts/orders.pact.json', name: 'Orders pact', type: 'pact' },
      },
    ]);

    expect(getConsumerContractsForResource(service)).toEqual([
      {
        path: './contracts/orders.pact.json',
        name: 'Orders pact',
        type: 'pact',
        filename: 'orders.pact.json',
        slug: 'orders-pact',
        messages: [{ id: 'OrderPaid', version: '1.0.0' }],
      },
    ]);
  });

  it('names a contract after its file when it has no name', () => {
    const service = createService([{ id: 'OrderPaid', contract: { path: 'contracts/orders.pact.json' } }]);

    expect(getConsumerContractsForResource(service)[0].name).toBe('orders.pact.json');
  });

  it('lists a file attached to several received messages once, with every message it covers', () => {
    const service = createService([
      { id: 'OrderPaid', version: '1.0.0', contract: { path: './contracts/payments.pact.json' } },
      { id: 'OrderRefunded', contract: { path: 'contracts/payments.pact.json' } },
    ]);

    const contracts = getConsumerContractsForResource(service);

    expect(contracts).toHaveLength(1);
    expect(contracts[0].messages).toEqual([
      { id: 'OrderPaid', version: '1.0.0' },
      { id: 'OrderRefunded', version: 'latest' },
    ]);
  });

  it('gives two files with the same name in different folders different page URLs', () => {
    const service = createService([
      { id: 'OrderPaid', contract: { path: './orders/contract.json' } },
      { id: 'OrderRefunded', contract: { path: './refunds/contract.json' } },
    ]);

    expect(getConsumerContractsForResource(service).map((contract) => contract.slug)).toEqual([
      'orders-contract-json',
      'refunds-contract-json',
    ]);
  });

  it('gives two files in the same folder that only differ by extension different page URLs', () => {
    const service = createService([
      { id: 'OrderPaid', contract: { path: './contracts/orders.json' } },
      { id: 'OrderRefunded', contract: { path: './contracts/orders.yaml' } },
    ]);

    expect(getConsumerContractsForResource(service).map((contract) => contract.slug)).toEqual([
      'contracts-orders-json',
      'contracts-orders-yaml',
    ]);
  });

  it('numbers page URLs that are still the same once punctuation is removed', () => {
    const service = createService([
      { id: 'OrderPaid', contract: { path: './orders.pact.json' } },
      { id: 'OrderRefunded', contract: { path: './orders-pact.json' } },
    ]);

    expect(getConsumerContractsForResource(service).map((contract) => contract.slug)).toEqual([
      'orders-pact-json',
      'orders-pact-json-2',
    ]);
  });

  it('gives a file whose name has no letters or numbers a page URL', () => {
    const service = createService([{ id: 'OrderPaid', contract: { path: './___.json' } }]);

    expect(getConsumerContractsForResource(service)[0].slug).toBe('contract');
  });

  it('uses the name and type of the first received message when a file is attached to several with different ones', () => {
    const service = createService([
      { id: 'OrderPaid', contract: { path: './orders.pact.json', name: 'Orders pact', type: 'pact' } },
      { id: 'OrderRefunded', contract: { path: './orders.pact.json', name: 'Refunds pact' } },
    ]);

    expect(getConsumerContractsForResource(service)).toMatchObject([{ name: 'Orders pact', type: 'pact' }]);
  });
});

describe('getConsumerContractsForMessage', () => {
  const contract = { path: './contracts/orders.pact.json' };

  it('returns the contract of each consumer that has one for the message', () => {
    const consumers = [
      createService([{ id: 'OrderPaid', version: '1.0.0', contract }]),
      createService([{ id: 'OrderPaid', version: '1.0.0' }], {
        data: { id: 'BillingService', version: '1.0.0', receives: [{ id: 'OrderPaid', version: '1.0.0' }] },
      }),
    ];

    const result = getConsumerContractsForMessage(createMessage(), consumers);

    expect(result).toHaveLength(1);
    expect(result[0].consumer).toEqual({
      collection: 'services',
      id: 'ShippingService',
      version: '1.0.0',
      name: 'Shipping Service',
    });
    expect(result[0].contract.slug).toBe('orders-pact');
  });

  it('names each contract after its consumer in the message page URL', () => {
    const consumers = [
      createService([{ id: 'OrderPaid', version: '1.0.0', contract }]),
      createService([{ id: 'OrderPaid', version: '1.0.0', contract }], {
        data: { id: 'BillingService', version: '1.0.0', receives: [{ id: 'OrderPaid', version: '1.0.0', contract }] },
      }),
    ];

    expect(getConsumerContractsForMessage(createMessage(), consumers).map((entry) => entry.slug)).toEqual([
      'ShippingService',
      'BillingService',
    ]);
  });

  it('adds the collection to the message page URL of a service and an agent that share an id', () => {
    const consumers = [
      createService([{ id: 'OrderPaid', version: '1.0.0', contract }]),
      createService([{ id: 'OrderPaid', version: '1.0.0', contract }], { collection: 'agents' }),
    ];

    expect(getConsumerContractsForMessage(createMessage(), consumers).map((entry) => entry.slug)).toEqual([
      'services-ShippingService',
      'agents-ShippingService',
    ]);
  });

  it('adds the file name to the message page URL when a consumer has two contracts for the message', () => {
    const consumers = [
      createService([
        { id: 'OrderPaid', version: '1.0.0', contract: { path: './orders.pact.json' } },
        { id: 'OrderPaid', version: '1.x', contract: { path: './orders-schema.json' } },
      ]),
    ];

    expect(getConsumerContractsForMessage(createMessage(), consumers).map((entry) => entry.slug)).toEqual([
      'ShippingService-orders-pact',
      'ShippingService-orders-schema',
    ]);
  });

  it('numbers a message page URL that would be the same as another consumer has', () => {
    const consumers = [
      createService([
        { id: 'OrderPaid', version: '1.0.0', contract: { path: './orders.json' } },
        { id: 'OrderPaid', version: '1.x', contract: { path: './refunds.json' } },
      ]),
      createService([], {
        data: {
          id: 'ShippingService-orders',
          version: '1.0.0',
          receives: [{ id: 'OrderPaid', version: '1.0.0', contract }],
        },
      }),
    ];

    expect(getConsumerContractsForMessage(createMessage(), consumers).map((entry) => entry.slug)).toEqual([
      'ShippingService-orders',
      'ShippingService-refunds',
      'ShippingService-orders-2',
    ]);
  });

  it('does not return a contract attached to a different message', () => {
    const consumers = [createService([{ id: 'OrderRefunded', version: '1.0.0', contract }])];

    expect(getConsumerContractsForMessage(createMessage(), consumers)).toEqual([]);
  });

  it('does not return a contract for another version of the message', () => {
    const consumers = [createService([{ id: 'OrderPaid', version: '2.0.0', contract }])];

    expect(getConsumerContractsForMessage(createMessage('1.0.0', '2.0.0'), consumers)).toEqual([]);
  });

  it('returns a contract on a pointer without a version only for the latest version of the message', () => {
    const consumers = [createService([{ id: 'OrderPaid', contract }])];

    expect(getConsumerContractsForMessage(createMessage('2.0.0', '2.0.0'), consumers)).toHaveLength(1);
    expect(getConsumerContractsForMessage(createMessage('1.0.0', '2.0.0'), consumers)).toEqual([]);
  });

  it('returns a contract on a pointer with a version range that includes the message version', () => {
    const consumers = [createService([{ id: 'OrderPaid', version: '1.x', contract }])];

    expect(getConsumerContractsForMessage(createMessage('1.4.0', '2.0.0'), consumers)).toHaveLength(1);
  });

  it('ignores the contracts of old versions of a consumer', () => {
    const consumers = [
      createService([{ id: 'OrderPaid', version: '1.0.0', contract }], {
        filePath: 'services/ShippingService/versioned/0.0.1/index.mdx',
      }),
    ];

    expect(getConsumerContractsForMessage(createMessage(), consumers)).toEqual([]);
  });

  it('links to the same page as the consumer when the consumer has two files with the same name', () => {
    const consumers = [
      createService([
        { id: 'OrderPaid', version: '1.0.0', contract: { path: './orders/contract.json' } },
        { id: 'OrderRefunded', version: '1.0.0', contract: { path: './refunds/contract.json' } },
      ]),
    ];

    expect(getConsumerContractsForMessage(createMessage(), consumers)[0].contract.slug).toBe('orders-contract-json');
  });
});

describe('getConsumerContractPath', () => {
  it('returns the page of a contract under the consumer that owns it', () => {
    expect(getConsumerContractPath({ collection: 'services', id: 'ShippingService', version: '1.0.0' }, 'orders-pact')).toBe(
      '/docs/services/ShippingService/1.0.0/contracts/orders-pact'
    );
  });
});
