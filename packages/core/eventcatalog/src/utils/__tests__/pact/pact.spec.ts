import { describe, expect, it } from 'vitest';
import { getPactFields, getPactInteractionsForMessage, matchPactInteractionsToMessage, parsePact } from '@utils/pact';

const messagePact = (messages: any[], version = '3.0.0') =>
  JSON.stringify({
    consumer: { name: 'shipping-api' },
    provider: { name: 'warehouse-service' },
    messages,
    metadata: { pactSpecification: { version } },
  });

const orderReady = {
  description: 'an order ready for shipping event',
  providerStates: [{ name: 'an order has been packed' }],
  contents: {
    orderId: '7e86e1d8-cd5f-4d6f-ae8e-bdc5ed3a0d13',
    parcelCount: 2,
    status: 'READY',
    shippingAddress: { city: 'Manchester', country: 'GB' },
  },
  matchingRules: {
    body: {
      '$.orderId': { matchers: [{ match: 'regex', regex: '^[0-9a-f-]{36}$' }] },
      '$.parcelCount': { matchers: [{ match: 'integer' }] },
      '$.shippingAddress.city': { matchers: [{ match: 'type' }] },
    },
  },
};

describe('parsePact', () => {
  it('returns null for a file that is not a Pact, so it is shown as written', () => {
    expect(parsePact('{"type":"object","properties":{}}')).toBeNull();
    expect(parsePact('openapi: 3.1.0')).toBeNull();
  });

  it('reads the consumer, the provider and the specification version', () => {
    expect(parsePact(messagePact([orderReady]))).toMatchObject({
      consumer: 'shipping-api',
      provider: 'warehouse-service',
      specificationVersion: '3.0.0',
    });
  });

  it('reads each message with its description and the states the provider is in', () => {
    const [interaction] = parsePact(messagePact([orderReady]))!.interactions;

    expect(interaction).toMatchObject({
      kind: 'message',
      description: 'an order ready for shipping event',
      providerStates: ['an order has been packed'],
    });
  });

  it('lists every field of the example as required, with the type of its example value', () => {
    const { schema } = parsePact(messagePact([orderReady]))!.interactions[0];

    expect(schema!.required).toEqual(['orderId', 'parcelCount', 'status', 'shippingAddress']);
    expect(schema!.properties.shippingAddress.type).toBe('object');
    expect(schema!.properties.shippingAddress.required).toEqual(['city', 'country']);
  });

  it('gives a field matched by a regex its pattern, without fixing its value', () => {
    const { orderId } = parsePact(messagePact([orderReady]))!.interactions[0].schema!.properties;

    expect(orderId).toMatchObject({ type: 'string', pattern: '^[0-9a-f-]{36}$' });
    expect(orderId).not.toHaveProperty('const');
  });

  it('gives a field matched as an integer or by type its type, without fixing its value', () => {
    const { parcelCount, shippingAddress } = parsePact(messagePact([orderReady]))!.interactions[0].schema!.properties;

    expect(parcelCount).toMatchObject({ type: 'integer' });
    expect(parcelCount).not.toHaveProperty('const');
    expect(shippingAddress.properties.city).toMatchObject({ type: 'string' });
    expect(shippingAddress.properties.city).not.toHaveProperty('const');
  });

  it('fixes the value of a field with no matching rule, because Pact then expects the example exactly', () => {
    const { status, shippingAddress } = parsePact(messagePact([orderReady]))!.interactions[0].schema!.properties;

    expect(status).toMatchObject({ type: 'string', const: 'READY' });
    expect(shippingAddress.properties.country).toMatchObject({ const: 'GB' });
  });

  it('does not fix the values of the fields under an object that is matched by type', () => {
    const pact = parsePact(
      messagePact([
        {
          description: 'an order',
          contents: { address: { city: 'Manchester' } },
          matchingRules: { body: { '$.address': { matchers: [{ match: 'type' }] } } },
        },
      ])
    )!;

    expect(pact.interactions[0].schema!.properties.address.properties.city).not.toHaveProperty('const');
  });

  it('describes the items of a list from its first example item and the rules for any item', () => {
    const pact = parsePact(
      messagePact([
        {
          description: 'an order',
          contents: { items: [{ sku: 'ABC-1', quantity: 1 }] },
          matchingRules: {
            body: {
              '$.items': { matchers: [{ match: 'type', min: 1 }] },
              '$.items[*].sku': { matchers: [{ match: 'regex', regex: '^[A-Z]+-\\d+$' }] },
            },
          },
        },
      ])
    )!;

    const { items } = pact.interactions[0].schema!.properties;
    expect(items).toMatchObject({ type: 'array', minItems: 1 });
    expect(items.items.properties.sku.pattern).toBe('^[A-Z]+-\\d+$');
    expect(items.items.properties.quantity).not.toHaveProperty('const');
  });

  it('reads a version 4 message, whose contents are wrapped with their content type', () => {
    const pact = parsePact(
      JSON.stringify({
        consumer: { name: 'shipping-api' },
        provider: { name: 'warehouse-service' },
        interactions: [
          {
            type: 'Asynchronous/Messages',
            description: 'an order ready for shipping event',
            contents: { contentType: 'application/json', encoded: false, content: { orderId: 'abc' } },
            matchingRules: { body: { '$.orderId': { matchers: [{ match: 'type' }] } } },
          },
        ],
        metadata: { pactSpecification: { version: '4.0' } },
      })
    )!;

    expect(pact.interactions[0]).toMatchObject({ kind: 'message' });
    expect(pact.interactions[0].schema!.properties.orderId).toEqual({ type: 'string', examples: ['abc'] });
  });

  it('reads a request and response interaction as what the consumer expects back, with version 2 rules', () => {
    const pact = parsePact(
      JSON.stringify({
        consumer: { name: 'web' },
        provider: { name: 'orders' },
        interactions: [
          {
            description: 'a request for an order',
            providerState: 'order 1 exists',
            request: { method: 'GET', path: '/orders/1' },
            response: {
              status: 200,
              body: { id: 1, total: 12.5 },
              matchingRules: { '$.body.id': { match: 'type' }, '$.body.total': { match: 'decimal' } },
            },
          },
        ],
        metadata: { pactSpecification: { version: '2.0.0' } },
      })
    )!;

    expect(pact.interactions[0]).toMatchObject({
      kind: 'response',
      request: 'GET /orders/1',
      providerStates: ['order 1 exists'],
    });
    expect(pact.interactions[0].schema!.properties.total.type).toBe('number');
    expect(pact.interactions[0].schema!.properties.id).not.toHaveProperty('const');
  });

  it('reads a version 4 message that is answered with messages as the first message that comes back', () => {
    const pact = parsePact(
      JSON.stringify({
        consumer: { name: 'web' },
        provider: { name: 'orders' },
        interactions: [
          {
            type: 'Synchronous/Messages',
            description: 'a request for the status of an order',
            request: { contents: { contentType: 'application/json', content: { orderId: 'abc' } } },
            response: [
              {
                contents: { contentType: 'application/json', content: { status: 'PACKED' } },
                matchingRules: { body: { '$.status': { matchers: [{ match: 'type' }] } } },
              },
            ],
          },
        ],
        metadata: { pactSpecification: { version: '4.0' } },
      })
    )!;

    expect(pact.interactions[0]).toMatchObject({ kind: 'message' });
    expect(pact.interactions[0].schema!.properties).toEqual({ status: { type: 'string', examples: ['PACKED'] } });
  });

  it('keeps every field of a version 3 payload that itself has fields called content and contentType', () => {
    const pact = parsePact(
      messagePact([
        { description: 'a document uploaded event', contents: { content: 'aGVsbG8=', contentType: 'text/plain', size: 5 } },
      ])
    )!;

    expect(Object.keys(pact.interactions[0].schema!.properties)).toEqual(['content', 'contentType', 'size']);
  });

  it('does not give a field that is not a list a minimum from a type matcher with min', () => {
    const pact = parsePact(
      messagePact([
        {
          description: 'an order',
          contents: { reference: 'ORD-1' },
          matchingRules: { body: { '$.reference': { matchers: [{ match: 'type', min: 1 }] } } },
        },
      ])
    )!;

    expect(pact.interactions[0].schema!.properties.reference).toEqual({ type: 'string', examples: ['ORD-1'] });
  });

  it('has no schema for an interaction without a JSON body', () => {
    const pact = parsePact(messagePact([{ description: 'a ping', contents: 'ping' }]))!;

    expect(pact.interactions[0].schema).toBeUndefined();
  });
});

describe('getPactInteractionsForMessage', () => {
  const pact = parsePact(
    messagePact([
      { description: 'a payment failed event', contents: { orderId: 'a' } },
      { description: 'a refund processed event', contents: { refundId: 'b' } },
    ])
  )!;

  it('returns the interaction whose description names the message', () => {
    const interactions = getPactInteractionsForMessage(pact, { id: 'payment-failed', name: 'Payment Failed' });

    expect(interactions.map((interaction) => interaction.description)).toEqual(['a payment failed event']);
  });

  it('matches on the id of a message when its name is not in the description', () => {
    const interactions = getPactInteractionsForMessage(pact, { id: 'RefundProcessed', name: 'Refund completed' });

    expect(interactions.map((interaction) => interaction.description)).toEqual(['a refund processed event']);
  });

  it('says whether the interactions were matched to the message', () => {
    expect(matchPactInteractionsToMessage(pact, { id: 'payment-failed' }).matched).toBe(true);
    expect(matchPactInteractionsToMessage(pact, { id: 'order-shipped' })).toMatchObject({ matched: false });
  });

  it('returns every interaction when none names the message', () => {
    expect(getPactInteractionsForMessage(pact, { id: 'order-shipped', name: 'Order Shipped' })).toHaveLength(2);
  });
});

describe('getPactFields', () => {
  it('lists every field with its path, type and how it is checked', () => {
    const { schema } = parsePact(messagePact([orderReady]))!.interactions[0];

    expect(getPactFields(schema)).toEqual([
      { path: 'orderId', type: 'string', check: 'pattern', pattern: '^[0-9a-f-]{36}$' },
      { path: 'parcelCount', type: 'integer', check: 'type' },
      { path: 'status', type: 'string', check: 'exact value', value: 'READY' },
      { path: 'shippingAddress.city', type: 'string', check: 'type' },
      { path: 'shippingAddress.country', type: 'string', check: 'exact value', value: 'GB' },
    ]);
  });

  it('marks the fields of the items of a list with []', () => {
    const pact = parsePact(
      messagePact([
        {
          description: 'an order',
          contents: { items: [{ sku: 'ABC-1' }], tags: ['gift'] },
          matchingRules: { body: { '$.items': { matchers: [{ match: 'type', min: 1 }] } } },
        },
      ])
    )!;

    expect(getPactFields(pact.interactions[0].schema).map((field) => field.path)).toEqual(['items[].sku', 'tags[]']);
  });

  const fieldsOf = (contents: unknown, body: Record<string, unknown>) =>
    getPactFields(
      parsePact(messagePact([{ description: 'an order', contents, matchingRules: { body } }]))!.interactions[0].schema
    );

  it('reports a field with an equality matcher as an exact value, even under a rule that matches by type', () => {
    expect(
      fieldsOf({ status: 'FAILED' }, { $: { matchers: [{ match: 'type' }] }, '$.status': { matchers: [{ match: 'equality' }] } })
    ).toEqual([{ path: 'status', type: 'string', check: 'exact value', value: 'FAILED' }]);
  });

  it('reports the fields of an object with an equality matcher as exact values, even under a rule higher up that matches by type', () => {
    expect(
      fieldsOf(
        { address: { city: 'Leeds' }, id: 'a' },
        { $: { matchers: [{ match: 'type' }] }, '$.address': { matchers: [{ match: 'equality' }] } }
      )
    ).toEqual([
      { path: 'address.city', type: 'string', check: 'exact value', value: 'Leeds' },
      { path: 'id', type: 'string', check: 'type' },
    ]);
  });

  it('lists a field that only a later example item of a list has, and does not fix a value the items disagree on', () => {
    expect(
      fieldsOf(
        {
          items: [
            { sku: 'A', qty: 1 },
            { sku: 'B', qty: 1, discountCode: 'SAVE' },
          ],
        },
        {}
      )
    ).toEqual([
      { path: 'items[].sku', type: 'string', check: 'type' },
      { path: 'items[].qty', type: 'integer', check: 'exact value', value: 1 },
      { path: 'items[].discountCode', type: 'string', check: 'exact value', value: 'SAVE' },
    ]);
  });

  it('applies a rule for any field of an object (*) to each of its fields, unless a field has a rule of its own', () => {
    expect(
      fieldsOf(
        { codes: { first: 'ABC', second: 'DEF' } },
        {
          '$.codes.*': { matchers: [{ match: 'regex', regex: '^[A-Z]{3}$' }] },
          '$.codes.second': { matchers: [{ match: 'type' }] },
        }
      )
    ).toEqual([
      { path: 'codes.first', type: 'string', check: 'pattern', pattern: '^[A-Z]{3}$' },
      { path: 'codes.second', type: 'string', check: 'type' },
    ]);
  });

  it('reports a field with an include matcher with the text it must include', () => {
    expect(
      fieldsOf({ reason: 'card declined' }, { '$.reason': { matchers: [{ match: 'include', value: 'declined' }] } })
    ).toEqual([{ path: 'reason', type: 'string', check: 'includes', includes: 'declined' }]);
  });

  it('lists a field whose example is an empty object, so it does not read as unused', () => {
    expect(fieldsOf({ meta: {} }, { '$.meta': { matchers: [{ match: 'type' }] } })).toEqual([
      { path: 'meta', type: 'object', check: 'type' },
    ]);
  });

  it('returns no fields for an interaction without a JSON body', () => {
    expect(getPactFields(undefined)).toEqual([]);
  });
});
