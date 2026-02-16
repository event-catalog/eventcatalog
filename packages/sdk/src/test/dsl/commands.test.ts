import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-dsl-commands');

const { toDSL, writeTeam, writeUser } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('toDSL - commands', () => {
  it('serializes a basic command', async () => {
    const dsl = await toDSL(
      { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', summary: 'Creates a new order', markdown: '' },
      { type: 'command' }
    );

    expect(dsl).toBe(`command CreateOrder {
  version 1.0.0
  name "Create Order"
  summary "Creates a new order"
}`);
  });

  it('serializes a command with owners and schema', async () => {
    const dsl = await toDSL(
      {
        id: 'CreateOrder',
        name: 'Create Order',
        version: '2.0.0',
        owners: ['api-team'],
        schemaPath: 'create-order.avsc',
        markdown: '',
      },
      { type: 'command' }
    );

    expect(dsl).toBe(`command CreateOrder {
  version 2.0.0
  name "Create Order"
  owner api-team
}`);
  });

  it('serializes a command with no body fields as inline declaration', async () => {
    const dsl = await toDSL({ id: 'CreateOrder', name: '', version: '', markdown: '' }, { type: 'command' });

    expect(dsl).toBe('command CreateOrder');
  });

  it('serializes an array of commands', async () => {
    const dsl = await toDSL(
      [
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' },
        { id: 'CancelOrder', name: 'Cancel Order', version: '1.0.0', markdown: '' },
      ],
      { type: 'command' }
    );

    expect(dsl).toBe(`command CreateOrder {
  version 1.0.0
  name "Create Order"
}

command CancelOrder {
  version 1.0.0
  name "Cancel Order"
}`);
  });

  it('deduplicates commands in array by id and version', async () => {
    const dsl = await toDSL(
      [
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' },
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' },
      ],
      { type: 'command' }
    );

    expect(dsl).toBe(`command CreateOrder {
  version 1.0.0
  name "Create Order"
}`);
  });

  describe('hydrate', () => {
    it('hydrates a command with a team owner', async () => {
      await writeTeam({ id: 'api-team', name: 'API Team', markdown: '' });

      const dsl = await toDSL(
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', owners: ['api-team'], markdown: '' },
        { type: 'command', hydrate: true }
      );

      expect(dsl).toBe(`team api-team {
  name "API Team"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
  owner api-team
}`);
    });

    it('hydrates a command with a user owner', async () => {
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        role: 'Engineer',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', owners: ['jdoe'], markdown: '' },
        { type: 'command', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
  owner jdoe
}`);
    });

    it('hydrates a command with both team and user owners', async () => {
      await writeTeam({ id: 'api-team', name: 'API Team', markdown: '' });
      await writeUser({ id: 'jdoe', name: 'Jane Doe', avatarUrl: 'https://example.com/jdoe.png', markdown: '' });

      const dsl = await toDSL(
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', owners: ['api-team', 'jdoe'], markdown: '' },
        { type: 'command', hydrate: true }
      );

      expect(dsl).toBe(`team api-team {
  name "API Team"
}

user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
  owner api-team
  owner jdoe
}`);
    });

    it('deduplicates owners across an array of commands', async () => {
      await writeTeam({ id: 'api-team', name: 'API Team', markdown: '' });

      const dsl = await toDSL(
        [
          { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', owners: ['api-team'], markdown: '' },
          { id: 'CancelOrder', name: 'Cancel Order', version: '1.0.0', owners: ['api-team'], markdown: '' },
        ],
        { type: 'command', hydrate: true }
      );

      expect(dsl).toBe(`team api-team {
  name "API Team"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
  owner api-team
}

command CancelOrder {
  version 1.0.0
  name "Cancel Order"
  owner api-team
}`);
    });

    it('skips owners that cannot be resolved', async () => {
      const dsl = await toDSL(
        { id: 'CreateOrder', name: 'Create Order', version: '1.0.0', owners: ['nonexistent'], markdown: '' },
        { type: 'command', hydrate: true }
      );

      expect(dsl).toBe(`command CreateOrder {
  version 1.0.0
  name "Create Order"
  owner nonexistent
}`);
    });
  });
});
