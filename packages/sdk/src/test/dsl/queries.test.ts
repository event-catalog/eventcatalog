import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-dsl-queries');

const { toDSL, writeTeam, writeUser } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('toDSL - queries', () => {
  it('serializes a basic query', async () => {
    const dsl = await toDSL(
      { id: 'GetOrder', name: 'Get Order', version: '1.0.0', summary: 'Gets an order by ID', markdown: '' },
      { type: 'query' }
    );

    expect(dsl).toBe(`query GetOrder {
  version 1.0.0
  name "Get Order"
  summary "Gets an order by ID"
}`);
  });

  it('serializes a query with owners', async () => {
    const dsl = await toDSL(
      { id: 'GetOrder', name: 'Get Order', version: '1.0.0', owners: ['api-team'], markdown: '' },
      { type: 'query' }
    );

    expect(dsl).toBe(`query GetOrder {
  version 1.0.0
  name "Get Order"
  owner api-team
}`);
  });

  it('serializes a query with no body fields as inline declaration', async () => {
    const dsl = await toDSL({ id: 'GetOrder', name: '', version: '', markdown: '' }, { type: 'query' });

    expect(dsl).toBe('query GetOrder');
  });

  it('serializes an array of queries', async () => {
    const dsl = await toDSL(
      [
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', markdown: '' },
        { id: 'GetInventory', name: 'Get Inventory', version: '2.0.0', markdown: '' },
      ],
      { type: 'query' }
    );

    expect(dsl).toBe(`query GetOrder {
  version 1.0.0
  name "Get Order"
}

query GetInventory {
  version 2.0.0
  name "Get Inventory"
}`);
  });

  it('deduplicates queries in array by id and version', async () => {
    const dsl = await toDSL(
      [
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', markdown: '' },
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', markdown: '' },
      ],
      { type: 'query' }
    );

    expect(dsl).toBe(`query GetOrder {
  version 1.0.0
  name "Get Order"
}`);
  });

  describe('hydrate', () => {
    it('hydrates a query with a team owner', async () => {
      await writeTeam({ id: 'api-team', name: 'API Team', markdown: '' });

      const dsl = await toDSL(
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', owners: ['api-team'], markdown: '' },
        { type: 'query', hydrate: true }
      );

      expect(dsl).toBe(`team api-team {
  name "API Team"
}

query GetOrder {
  version 1.0.0
  name "Get Order"
  owner api-team
}`);
    });

    it('hydrates a query with a user owner', async () => {
      await writeUser({
        id: 'jdoe',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jdoe.png',
        role: 'Engineer',
        markdown: '',
      });

      const dsl = await toDSL(
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', owners: ['jdoe'], markdown: '' },
        { type: 'query', hydrate: true }
      );

      expect(dsl).toBe(`user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
  role "Engineer"
}

query GetOrder {
  version 1.0.0
  name "Get Order"
  owner jdoe
}`);
    });

    it('hydrates a query with both team and user owners', async () => {
      await writeTeam({ id: 'api-team', name: 'API Team', markdown: '' });
      await writeUser({ id: 'jdoe', name: 'Jane Doe', avatarUrl: 'https://example.com/jdoe.png', markdown: '' });

      const dsl = await toDSL(
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', owners: ['api-team', 'jdoe'], markdown: '' },
        { type: 'query', hydrate: true }
      );

      expect(dsl).toBe(`team api-team {
  name "API Team"
}

user jdoe {
  name "Jane Doe"
  avatar "https://example.com/jdoe.png"
}

query GetOrder {
  version 1.0.0
  name "Get Order"
  owner api-team
  owner jdoe
}`);
    });

    it('skips owners that cannot be resolved', async () => {
      const dsl = await toDSL(
        { id: 'GetOrder', name: 'Get Order', version: '1.0.0', owners: ['nonexistent'], markdown: '' },
        { type: 'query', hydrate: true }
      );

      expect(dsl).toBe(`query GetOrder {
  version 1.0.0
  name "Get Order"
  owner nonexistent
}`);
    });
  });
});
