import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-dsl-events');

const { toDSL, writeTeam, writeUser } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('toDSL - events', () => {
  it('serializes a basic event', async () => {
    const dsl = await toDSL(
      { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', summary: 'Fired when order is created', markdown: '' },
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "Fired when order is created"
}`);
  });

  it('serializes an event with owners', async () => {
    const dsl = await toDSL(
      { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['orders-team', 'platform-team'], markdown: '' },
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner orders-team
  owner platform-team
}`);
  });

  it('serializes an event with schemaPath (schema is skipped in DSL output)', async () => {
    const dsl = await toDSL(
      { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', schemaPath: 'schema.json', markdown: '' },
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}`);
  });

  it('serializes a deprecated event', async () => {
    const dsl = await toDSL(
      { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', deprecated: true, markdown: '' },
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  deprecated true
}`);
  });

  it('serializes a draft event', async () => {
    const dsl = await toDSL(
      { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', draft: true, markdown: '' },
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  draft true
}`);
  });

  it('serializes an event with all fields', async () => {
    const dsl = await toDSL(
      {
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Fired when order is created',
        owners: ['orders-team'],
        schemaPath: 'schema.json',
        deprecated: true,
        draft: true,
        markdown: '',
      },
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "Fired when order is created"
  owner orders-team
  deprecated true
  draft true
}`);
  });

  it('serializes an event with no body fields as inline declaration', async () => {
    const dsl = await toDSL({ id: 'OrderCreated', name: '', version: '', markdown: '' }, { type: 'event' });

    expect(dsl).toBe('event OrderCreated');
  });

  it('serializes an array of events', async () => {
    const dsl = await toDSL(
      [
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' },
        { id: 'OrderUpdated', name: 'Order Updated', version: '2.0.0', markdown: '' },
      ],
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}

event OrderUpdated {
  version 2.0.0
  name "Order Updated"
}`);
  });

  it('deduplicates events in array by id and version', async () => {
    const dsl = await toDSL(
      [
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' },
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' },
      ],
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}`);
  });

  describe('hydrate', () => {
    it('hydrates an event with a team owner', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });

      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['orders-team'], markdown: '' },
        { type: 'event', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner orders-team
}`);
    });

    it('hydrates an event with a user owner', async () => {
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        role: 'Engineer',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['jdoe'], markdown: '' },
        { type: 'event', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner jdoe
}`);
    });

    it('hydrates an event with both team and user owners', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });
      await writeUser({ id: 'jdoe', name: 'Jane Doe', avatarUrl: 'https://example.com/jdoe.png', markdown: '' });

      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['orders-team', 'jdoe'], markdown: '' },
        { type: 'event', hydrate: true }
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
  owner orders-team
  owner jdoe
}`);
    });

    it('hydrates an event with a team that has email and summary', async () => {
      await writeTeam({
        id: 'orders-team',
        name: 'Orders Team',
        summary: 'Manages orders',
        email: 'orders@example.com',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['orders-team'], markdown: '' },
        { type: 'event', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
  summary "Manages orders"
  email "orders@example.com"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner orders-team
}`);
    });

    it('skips owners that cannot be resolved as team or user', async () => {
      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['nonexistent-team'], markdown: '' },
        { type: 'event', hydrate: true }
      );

      expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner nonexistent-team
}`);
    });

    it('deduplicates owners across an array of events', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });

      const dsl = await toDSL(
        [
          { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['orders-team'], markdown: '' },
          { id: 'OrderUpdated', name: 'Order Updated', version: '1.0.0', owners: ['orders-team'], markdown: '' },
        ],
        { type: 'event', hydrate: true }
      );

      expect(dsl).toBe(`team orders-team {
  name "Orders Team"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner orders-team
}

event OrderUpdated {
  version 1.0.0
  name "Order Updated"
  owner orders-team
}`);
    });

    it('does not hydrate owners when hydrate is false', async () => {
      await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });

      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['orders-team'], markdown: '' },
        { type: 'event' }
      );

      expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner orders-team
}`);
    });

    it('hydrates a user with email and slack', async () => {
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        email: 'jdoe@example.com',
        slackDirectMessageUrl: 'https://slack.com/jdoe',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', owners: ['jdoe'], markdown: '' },
        { type: 'event', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  email "jdoe@example.com"
  slack "https://slack.com/jdoe"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  owner jdoe
}`);
    });
  });

  it('does not deduplicate events with different versions', async () => {
    const dsl = await toDSL(
      [
        { id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' },
        { id: 'OrderCreated', name: 'Order Created', version: '2.0.0', markdown: '' },
      ],
      { type: 'event' }
    );

    expect(dsl).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
}

event OrderCreated {
  version 2.0.0
  name "Order Created"
}`);
  });
});
