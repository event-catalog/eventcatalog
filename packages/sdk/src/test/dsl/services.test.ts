import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-dsl-services');

const { writeEvent, writeCommand, writeQuery, writeChannel, writeTeam, writeUser, toDSL } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('toDSL - services', () => {
  it('serializes a basic service with no sends/receives', async () => {
    const dsl = await toDSL(
      { id: 'OrderService', name: 'Order Service', version: '1.0.0', summary: 'Handles orders', markdown: '' },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  summary "Handles orders"
}`);
  });

  it('serializes a service with sends (event)', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}`);
  });

  it('serializes a service with receives (command)', async () => {
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '2.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        receives: [{ id: 'CreateOrder', version: '2.0.0' }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  receives command CreateOrder@2.0.0
}`);
  });

  it('serializes a service with receives (command) as the latest version', async () => {
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '2.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        receives: [{ id: 'CreateOrder' }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  receives command CreateOrder
}`);
  });

  it('serializes a service with sends and channel (to)', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
}`);
  });

  it('serializes a service with receives and channel (from)', async () => {
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        receives: [{ id: 'CreateOrder', version: '1.0.0', from: [{ id: 'orders-queue', version: '2.0.0' }] }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  receives command CreateOrder@1.0.0 from orders-queue@2.0.0
}`);
  });

  it('serializes a service with multiple channels on sends', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [
          {
            id: 'OrderCreated',
            version: '1.0.0',
            to: [
              { id: 'orders-topic', version: '1.0.0' },
              { id: 'analytics-topic', version: '2.0.0' },
            ],
          },
        ],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0, analytics-topic@2.0.0
}`);
  });

  it('serializes a service with writes-to', async () => {
    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        writesTo: [{ id: 'OrdersDB', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  writes-to container OrdersDB@1.0.0
}`);
  });

  it('serializes a service with reads-from without version', async () => {
    const dsl = await toDSL(
      { id: 'OrderService', name: 'Order Service', version: '1.0.0', readsFrom: [{ id: 'AnalyticsDB' }], markdown: '' },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  reads-from container AnalyticsDB
}`);
  });

  it('serializes a service with writes-to and reads-from', async () => {
    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        writesTo: [{ id: 'OrdersDB', version: '1.0.0' }],
        readsFrom: [{ id: 'InventoryDB', version: '2.0.0' }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  writes-to container OrdersDB@1.0.0
  reads-from container InventoryDB@2.0.0
}`);
  });

  it('serializes a service with sends without version', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      { id: 'OrderService', name: 'Order Service', version: '1.0.0', sends: [{ id: 'OrderCreated' }], markdown: '' },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated
}`);
  });

  it('serializes a service with multiple message types (event, command, query)', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });
    await writeQuery({ id: 'GetOrder', name: 'Get Order', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        receives: [
          { id: 'CreateOrder', version: '1.0.0' },
          { id: 'GetOrder', version: '1.0.0' },
        ],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
  receives command CreateOrder@1.0.0
  receives query GetOrder@1.0.0
}`);
  });

  it('serializes a service with channel on sends and receives', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic' }] }],
        receives: [{ id: 'CreateOrder', version: '1.0.0', from: [{ id: 'commands-queue', version: '1.0.0' }] }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to orders-topic
  receives command CreateOrder@1.0.0 from commands-queue@1.0.0
}`);
  });

  it('skips sends for messages that cannot be resolved to a type', async () => {
    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'NonExistentEvent', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
}`);
  });

  it('serializes a service with hydrate option prepending message definitions', async () => {
    await writeEvent({
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      summary: 'An order was created',
      markdown: '',
    });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'service', hydrate: true }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "An order was created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}`);
  });

  it('hydrated service includes all message type definitions', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', summary: 'Creates an order', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        receives: [{ id: 'CreateOrder', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'service', hydrate: true }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
  summary "Creates an order"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
  receives command CreateOrder@1.0.0
}`);
  });

  it('deduplicates hydrated messages when same message appears in sends and receives', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        receives: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'service', hydrate: true }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
  receives event OrderCreated@1.0.0
}`);
  });

  it('serializes an array of services', async () => {
    const dsl = await toDSL(
      [
        { id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' },
        { id: 'PaymentService', name: 'Payment Service', version: '1.0.0', markdown: '' },
      ],
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
}

service PaymentService {
  version 1.0.0
  name "Payment Service"
}`);
  });

  it('deduplicates services in array', async () => {
    const dsl = await toDSL(
      [
        { id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' },
        { id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' },
      ],
      { type: 'service' }
    );

    expect(dsl).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
}`);
  });

  describe('hydrate owners', () => {
    it('hydrates a service with a team owner', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });

      const dsl = await toDSL(
        { id: 'OrderService', name: 'Order Service', version: '1.0.0', owners: ['orders-team'], markdown: '' },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  owner orders-team
}`);
    });

    it('hydrates a service with a user owner', async () => {
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        role: 'Engineer',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'OrderService', name: 'Order Service', version: '1.0.0', owners: ['jdoe'], markdown: '' },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  owner jdoe
}`);
    });

    it('hydrates a service with both team and user owners and messages', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });
      await writeUser({ id: 'jdoe', name: 'Jane Doe', avatarUrl: 'https://example.com/jdoe.png', markdown: '' });
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      const dsl = await toDSL(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          owners: ['orders-team', 'jdoe'],
          sends: [{ id: 'OrderCreated', version: '1.0.0' }],
          markdown: '',
        },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
}

user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  owner orders-team
  owner jdoe
  sends event OrderCreated@1.0.0
}`);
    });
  });

  describe('hydrate channels', () => {
    it('hydrates channels referenced in sends (to)', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeChannel({
        id: 'orders-topic',
        name: 'Orders Topic',
        version: '1.0.0',
        address: 'orders.events',
        protocols: ['kafka'],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`channel orders-topic {
  version 1.0.0
  name "Orders Topic"
  address "orders.events"
  protocol "kafka"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
}`);
    });

    it('hydrates channels referenced in receives (from)', async () => {
      await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });
      await writeChannel({
        id: 'commands-queue',
        name: 'Commands Queue',
        version: '1.0.0',
        address: 'orders.commands',
        protocols: ['sqs'],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          receives: [{ id: 'CreateOrder', version: '1.0.0', from: [{ id: 'commands-queue', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`channel commands-queue {
  version 1.0.0
  name "Commands Queue"
  address "orders.commands"
  protocol "sqs"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  receives command CreateOrder@1.0.0 from commands-queue@1.0.0
}`);
    });

    it('deduplicates channels used by multiple messages', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeEvent({ id: 'OrderUpdated', name: 'Order Updated', version: '1.0.0', markdown: '' });
      await writeChannel({ id: 'orders-topic', name: 'Orders Topic', version: '1.0.0', address: 'orders.events', markdown: '' });

      const dsl = await toDSL(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          sends: [
            { id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] },
            { id: 'OrderUpdated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] },
          ],
          markdown: '',
        },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`channel orders-topic {
  version 1.0.0
  name "Orders Topic"
  address "orders.events"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
}

event OrderUpdated {
  version 1.0.0
  name "Order Updated"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
  sends event OrderUpdated@1.0.0 to orders-topic@1.0.0
}`);
    });

    it('skips channels that cannot be resolved', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

      const dsl = await toDSL(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'nonexistent-topic', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to nonexistent-topic@1.0.0
}`);
    });
  });

  describe('hydrate full integration', () => {
    it('hydrates a service with messages, channels, team, and user', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', summary: 'Manages orders', markdown: '' });
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        role: 'Engineer',
        markdown: '',
      });
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Fired when order is created',
        markdown: '',
      });
      await writeCommand({
        id: 'CreateOrder',
        name: 'Create Order',
        version: '1.0.0',
        summary: 'Command to create an order',
        markdown: '',
      });
      await writeChannel({
        id: 'orders-topic',
        name: 'Orders Topic',
        version: '1.0.0',
        address: 'orders.events',
        protocols: ['kafka'],
        markdown: '',
      });
      await writeChannel({
        id: 'commands-queue',
        name: 'Commands Queue',
        version: '1.0.0',
        address: 'orders.commands',
        protocols: ['sqs'],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          summary: 'Handles orders',
          owners: ['orders-team', 'jdoe'],
          sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
          receives: [{ id: 'CreateOrder', version: '1.0.0', from: [{ id: 'commands-queue', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'service', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
  summary "Manages orders"
}

user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

channel orders-topic {
  version 1.0.0
  name "Orders Topic"
  address "orders.events"
  protocol "kafka"
}

channel commands-queue {
  version 1.0.0
  name "Commands Queue"
  address "orders.commands"
  protocol "sqs"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "Fired when order is created"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
  summary "Command to create an order"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  summary "Handles orders"
  owner orders-team
  owner jdoe
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
  receives command CreateOrder@1.0.0 from commands-queue@1.0.0
}`);
    });
  });
});
