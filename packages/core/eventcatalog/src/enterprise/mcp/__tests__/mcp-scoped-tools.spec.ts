/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, expect, it } from 'vitest';
import { createScopedCatalogTools } from '../mcp-scoped-tools';
import { McpScope } from '../mcp-scope';

const domain = {
  id: 'payments-1.0.0',
  collection: 'domains',
  data: { id: 'payments', version: '1.0.0', name: 'Payments' },
};
const service = {
  id: 'payment-service-1.0.0',
  collection: 'services',
  data: {
    id: 'payment-service',
    version: '1.0.0',
    name: 'Payment Service',
    summary: 'Processes payments',
    owners: ['payments-team'],
  },
};

const createScope = () => {
  const scope = new McpScope({ kind: 'domain', id: 'payments' }, domain);
  scope.add(domain);
  scope.add(service);
  return scope;
};

describe('createScopedCatalogTools', () => {
  it('lists only resources included in the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    await expect(tools.getResources({ collection: 'services' })).resolves.toEqual({
      resources: [
        {
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          summary: 'Processes payments',
        },
      ],
      nextCursor: undefined,
      totalCount: 1,
      scope: { kind: 'domain', id: 'payments', version: '1.0.0' },
    });
  });

  it('fails closed before looking up a resource outside the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    await expect(tools.getResource({ collection: 'services', id: 'ordering-service', version: '1.0.0' })).resolves.toEqual({
      error: 'Resource not found: services/ordering-service (1.0.0)',
    });
  });

  it('searches owners only across resources in the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    const result = await tools.findResourcesByOwner({ ownerId: 'payments-team' });

    expect(result.resources).toEqual([
      {
        collection: 'services',
        id: 'payment-service',
        version: '1.0.0',
        name: 'Payment Service',
      },
    ]);
  });
});
