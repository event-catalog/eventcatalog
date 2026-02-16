import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-dsl-domains');

const { writeEvent, writeCommand, writeService, writeChannel, writeTeam, writeUser, toDSL } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('toDSL - domains', () => {
  it('serializes a basic domain', async () => {
    const dsl = await toDSL(
      { id: 'Orders', name: 'Orders Domain', version: '1.0.0', summary: 'Manages order lifecycle', markdown: '' },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Manages order lifecycle"
}`);
  });

  it('serializes a domain with owners', async () => {
    const dsl = await toDSL(
      { id: 'Orders', name: 'Orders Domain', version: '1.0.0', owners: ['orders-team'], markdown: '' },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  owner orders-team
}`);
  });

  it('serializes a domain with service references', async () => {
    const dsl = await toDSL(
      {
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        services: [
          { id: 'OrderService', version: '1.0.0' },
          { id: 'PaymentService', version: '2.0.0' },
        ],
        markdown: '',
      },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService@1.0.0
  service PaymentService@2.0.0
}`);
  });

  it('serializes a domain with service references without version', async () => {
    const dsl = await toDSL(
      { id: 'Orders', name: 'Orders Domain', version: '1.0.0', services: [{ id: 'OrderService' }], markdown: '' },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService
}`);
  });

  it('serializes a domain with sends (event)', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      { id: 'Orders', name: 'Orders Domain', version: '1.0.0', sends: [{ id: 'OrderCreated', version: '1.0.0' }], markdown: '' },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  sends event OrderCreated@1.0.0
}`);
  });

  it('serializes a domain with receives (command)', async () => {
    await writeCommand({ id: 'ProcessPayment', name: 'Process Payment', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        receives: [{ id: 'ProcessPayment', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  receives command ProcessPayment@1.0.0
}`);
  });

  it('serializes a domain with sends and channel (to)', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const dsl = await toDSL(
      {
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
        markdown: '',
      },
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
}`);
  });

  it('serializes a domain with hydrate option', async () => {
    await writeEvent({
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      summary: 'An order was created',
      markdown: '',
    });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const dsl = await toDSL(
      {
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        services: [{ id: 'OrderService', version: '1.0.0' }],
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'domain', hydrate: true }
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
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService@1.0.0
  sends event OrderCreated@1.0.0
}`);
  });

  it('deduplicates hydrated messages across domain and service', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const dsl = await toDSL(
      {
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        services: [{ id: 'OrderService', version: '1.0.0' }],
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'domain', hydrate: true }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService@1.0.0
  sends event OrderCreated@1.0.0
}`);
  });

  it('full integration: domain with hydrated services and messages', async () => {
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
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      summary: 'Handles orders',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      receives: [{ id: 'CreateOrder', version: '1.0.0' }],
      markdown: '',
    });

    const dsl = await toDSL(
      {
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        summary: 'Order management',
        services: [{ id: 'OrderService', version: '1.0.0' }],
        markdown: '',
      },
      { type: 'domain', hydrate: true }
    );

    expect(dsl).toBe(`event OrderCreated {
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
  sends event OrderCreated@1.0.0
  receives command CreateOrder@1.0.0
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Order management"
  service OrderService@1.0.0
}`);
  });

  it('serializes an array of domains', async () => {
    const dsl = await toDSL(
      [
        { id: 'Orders', name: 'Orders Domain', version: '1.0.0', markdown: '' },
        { id: 'Payments', name: 'Payments Domain', version: '1.0.0', markdown: '' },
      ],
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
}

domain Payments {
  version 1.0.0
  name "Payments Domain"
}`);
  });

  it('deduplicates domains in array', async () => {
    const dsl = await toDSL(
      [
        { id: 'Orders', name: 'Orders Domain', version: '1.0.0', markdown: '' },
        { id: 'Orders', name: 'Orders Domain', version: '1.0.0', markdown: '' },
      ],
      { type: 'domain' }
    );

    expect(dsl).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
}`);
  });

  describe('hydrate owners', () => {
    it('hydrates a domain with a team owner', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });

      const dsl = await toDSL(
        { id: 'Orders', name: 'Orders Domain', version: '1.0.0', owners: ['orders-team'], markdown: '' },
        { type: 'domain', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  owner orders-team
}`);
    });

    it('hydrates a domain with a user owner', async () => {
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        role: 'Engineer',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'Orders', name: 'Orders Domain', version: '1.0.0', owners: ['jdoe'], markdown: '' },
        { type: 'domain', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  owner jdoe
}`);
    });

    it('hydrates a domain with both team and user owners and services', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });
      await writeUser({ id: 'jdoe', name: 'Jane Doe', avatarUrl: 'https://example.com/jdoe.png', markdown: '' });
      await writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          owners: ['orders-team', 'jdoe'],
          services: [{ id: 'OrderService', version: '1.0.0' }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
}

user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
}

service OrderService {
  version 1.0.0
  name "Order Service"
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  owner orders-team
  owner jdoe
  service OrderService@1.0.0
}`);
    });
  });

  describe('hydrate channels', () => {
    it('hydrates channels from domain-level sends (to)', async () => {
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
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
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

domain Orders {
  version 1.0.0
  name "Orders Domain"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
}`);
    });

    it('hydrates channels from domain-level receives (from)', async () => {
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
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          receives: [{ id: 'CreateOrder', version: '1.0.0', from: [{ id: 'commands-queue', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
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

domain Orders {
  version 1.0.0
  name "Orders Domain"
  receives command CreateOrder@1.0.0 from commands-queue@1.0.0
}`);
    });

    it('hydrates channels from service sends within domain', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeChannel({
        id: 'orders-topic',
        name: 'Orders Topic',
        version: '1.0.0',
        address: 'orders.events',
        protocols: ['kafka'],
        markdown: '',
      });
      await writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          services: [{ id: 'OrderService', version: '1.0.0' }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
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
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService@1.0.0
}`);
    });

    it('deduplicates channels shared between service and domain', async () => {
      await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await writeChannel({
        id: 'orders-topic',
        name: 'Orders Topic',
        version: '1.0.0',
        address: 'orders.events',
        markdown: '',
      });
      await writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          services: [{ id: 'OrderService', version: '1.0.0' }],
          sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
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

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService@1.0.0
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
}`);
    });
  });

  describe('hydrate service owners', () => {
    it('hydrates owners of services within domain', async () => {
      await writeTeam({ id: 'svc-team', name: 'Service Team', markdown: '' });
      await writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        owners: ['svc-team'],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          services: [{ id: 'OrderService', version: '1.0.0' }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
      );

      expect(dsl).toBe(`team svc-team {
  name "Service Team"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  owner svc-team
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  service OrderService@1.0.0
}`);
    });

    it('deduplicates owners shared between domain and service', async () => {
      await writeTeam({ id: 'shared-team', name: 'Shared Team', markdown: '' });
      await writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        owners: ['shared-team'],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          owners: ['shared-team'],
          services: [{ id: 'OrderService', version: '1.0.0' }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
      );

      expect(dsl).toBe(`team shared-team {
  name "Shared Team"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  owner shared-team
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  owner shared-team
  service OrderService@1.0.0
}`);
    });
  });

  describe('hydrate full integration', () => {
    it('hydrates a domain with services, messages, channels, team, and user', async () => {
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
      await writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        summary: 'Handles orders',
        owners: ['orders-team'],
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
        receives: [{ id: 'CreateOrder', version: '1.0.0', from: [{ id: 'commands-queue', version: '1.0.0' }] }],
        markdown: '',
      });

      const dsl = await toDSL(
        {
          id: 'Orders',
          name: 'Orders Domain',
          version: '1.0.0',
          summary: 'Order management',
          owners: ['jdoe'],
          services: [{ id: 'OrderService', version: '1.0.0' }],
          markdown: '',
        },
        { type: 'domain', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

team orders-team {
  name "Orders Team"
  summary "Manages orders"
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
  sends event OrderCreated@1.0.0 to orders-topic@1.0.0
  receives command CreateOrder@1.0.0 from commands-queue@1.0.0
}

domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Order management"
  owner jdoe
  service OrderService@1.0.0
}`);
    });
  });
});
