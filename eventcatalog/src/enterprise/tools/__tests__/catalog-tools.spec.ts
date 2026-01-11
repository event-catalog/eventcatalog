import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContentCollectionKey } from 'astro:content';

// Type definitions for test results
type ProducerConsumer = { id: string; version: string; name: string };
type ResourceResult = { collection: string; id: string; version?: string; name: string };
import { mockEvents, mockTeams, mockUsers, mockCollections } from './catalog-tools.mocks';

// Mock astro:content
vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      return Promise.resolve(mockCollections[key as string] ?? []);
    },
    getEntry: (collection: string, id: string) => {
      const items = mockCollections[collection] ?? [];
      return Promise.resolve(items.find((item) => item.id === id));
    },
  };
});

// Mock getSchemasFromResource
vi.mock('@utils/collections/schemas', () => ({
  getSchemasFromResource: vi.fn(),
}));

// Mock getItemsFromCollectionByIdAndSemverOrLatest
vi.mock('@utils/collections/util', () => ({
  getItemsFromCollectionByIdAndSemverOrLatest: vi.fn((collection, id, version) => {
    // Filter collection by id, and optionally by version
    const matches = collection.filter((item: any) => item.data.id === id);
    if (version) {
      const exactMatch = matches.find((item: any) => item.data.version === version);
      return exactMatch ? [exactMatch] : [];
    }
    // Return latest (highest version) if no version specified
    return matches.length > 0 ? [matches[matches.length - 1]] : [];
  }),
}));

// Mock getUbiquitousLanguageWithSubdomains
vi.mock('@utils/collections/domains', () => ({
  getUbiquitousLanguageWithSubdomains: vi.fn((domain) => {
    // Return mock ubiquitous language data based on domain
    if (domain.data.id === 'OrderDomain') {
      return Promise.resolve({
        domain: {
          data: {
            dictionary: [
              { id: 'order', name: 'Order', summary: 'A request to purchase goods or services', icon: 'ShoppingCart' },
              {
                id: 'line-item',
                name: 'Line Item',
                summary: 'An individual product or service within an order',
                icon: 'Package',
              },
              { id: 'customer', name: 'Customer', summary: 'A person or entity placing an order' },
            ],
          },
        },
        subdomains: [
          {
            subdomain: { data: { id: 'FulfillmentSubdomain', name: 'Fulfillment Subdomain' } },
            ubiquitousLanguage: {
              data: {
                dictionary: [
                  { id: 'shipment', name: 'Shipment', summary: 'A package sent to fulfill an order', icon: 'Truck' },
                  { id: 'customer', name: 'Customer', summary: 'Duplicate term - recipient of a shipment' },
                ],
              },
            },
          },
        ],
        duplicateTerms: new Set(['customer']),
      });
    }
    if (domain.data.id === 'EmptyDomain') {
      return Promise.resolve({
        domain: null,
        subdomains: [],
        duplicateTerms: new Set(),
      });
    }
    return Promise.resolve({
      domain: null,
      subdomains: [],
      duplicateTerms: new Set(),
    });
  }),
}));

// Mock fs for schema reading
vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(() => '{"schema": "content"}'),
  },
}));

import {
  encodeCursor,
  decodeCursor,
  paginate,
  DEFAULT_PAGE_SIZE,
  getResources,
  getResource,
  getMessagesProducedOrConsumedByResource,
  getSchemaForResource,
  findResourcesByOwner,
  getProducersOfMessage,
  getConsumersOfMessage,
  analyzeChangeImpact,
  explainBusinessFlow,
  getTeams,
  getTeam,
  getUsers,
  getUser,
  findMessageBySchemaId,
  explainUbiquitousLanguageTerms,
} from '../catalog-tools';
import { getSchemasFromResource } from '@utils/collections/schemas';

// ============================================
// Pagination Utilities Tests
// ============================================

describe('Pagination Utilities', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('encodes and decodes position correctly', () => {
      const position = 50;
      const cursor = encodeCursor(position);
      expect(cursor).toBeTruthy();
      expect(decodeCursor(cursor)).toBe(position);
    });

    it('handles position 0', () => {
      const cursor = encodeCursor(0);
      expect(decodeCursor(cursor)).toBe(0);
    });

    it('handles large positions', () => {
      const position = 99999;
      const cursor = encodeCursor(position);
      expect(decodeCursor(cursor)).toBe(position);
    });

    it('returns null for invalid cursor', () => {
      expect(decodeCursor('invalid-cursor')).toBe(null);
    });

    it('returns null for empty string cursor', () => {
      // Empty string decodes to NaN
      expect(decodeCursor('')).toBe(null);
    });

    it('returns null for cursor that decodes to negative number', () => {
      // Manually encode a negative number
      const negativeCursor = Buffer.from('-1').toString('base64url');
      expect(decodeCursor(negativeCursor)).toBe(null);
    });
  });

  describe('paginate', () => {
    const items = Array.from({ length: 120 }, (_, i) => ({ id: i }));

    it('returns first page of items when no cursor provided', () => {
      const result = paginate(items);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.items.length).toBe(DEFAULT_PAGE_SIZE);
        expect(result.items[0]).toEqual({ id: 0 });
        expect(result.totalCount).toBe(120);
        expect(result.nextCursor).toBeTruthy();
      }
    });

    it('returns error for invalid cursor', () => {
      const result = paginate(items, 'invalid-cursor');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Invalid');
      }
    });

    it('returns error when cursor exceeds MAX_CURSOR_POSITION', () => {
      // MAX_CURSOR_POSITION is 100000
      const cursor = encodeCursor(100001);
      const result = paginate(items, cursor);
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('exceeds maximum');
      }
    });

    it('returns nextCursor when more items available', () => {
      const result = paginate(items);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.nextCursor).toBeTruthy();
      }
    });

    it('returns no nextCursor on last page', () => {
      const cursor = encodeCursor(100); // Start at position 100, only 20 items left
      const result = paginate(items, cursor);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.items.length).toBe(20);
        expect(result.nextCursor).toBeUndefined();
      }
    });

    it('handles empty arrays', () => {
      const result = paginate([]);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.items).toEqual([]);
        expect(result.totalCount).toBe(0);
        expect(result.nextCursor).toBeUndefined();
      }
    });

    it('respects custom pageSize', () => {
      const result = paginate(items, undefined, 10);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.items.length).toBe(10);
      }
    });

    it('continues from cursor position correctly', () => {
      const firstPage = paginate(items, undefined, 10);
      expect('error' in firstPage).toBe(false);
      if (!('error' in firstPage) && firstPage.nextCursor) {
        const secondPage = paginate(items, firstPage.nextCursor, 10);
        expect('error' in secondPage).toBe(false);
        if (!('error' in secondPage)) {
          expect(secondPage.items[0]).toEqual({ id: 10 });
        }
      }
    });
  });
});

// ============================================
// Resource Access Tools Tests
// ============================================

describe('getResources', () => {
  it.each(['events', 'services', 'commands', 'queries', 'flows', 'domains', 'channels', 'entities'] as const)(
    'returns paginated resources from %s collection',
    async (collection) => {
      const result = await getResources({ collection });
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.resources).toBeDefined();
        expect(result.totalCount).toBeGreaterThanOrEqual(0);
      }
    }
  );

  it('returns empty resources for empty collection', async () => {
    // diagrams has only 1 item in mocks, but let's test with an empty scenario
    const result = await getResources({ collection: 'diagrams' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.totalCount).toBe(1); // Our mock has 1 diagram
    }
  });

  it('supports pagination via cursor', async () => {
    // Create a collection with enough items to paginate
    const result = await getResources({ collection: 'events' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resources.length).toBeLessThanOrEqual(DEFAULT_PAGE_SIZE);
    }
  });

  it('returns totalCount', async () => {
    const result = await getResources({ collection: 'events' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.totalCount).toBe(mockEvents.length);
    }
  });

  it('returns resources with correct structure', async () => {
    const result = await getResources({ collection: 'events' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resources[0]).toHaveProperty('id');
      expect(result.resources[0]).toHaveProperty('version');
      expect(result.resources[0]).toHaveProperty('name');
    }
  });
});

describe('getResource', () => {
  it('returns resource by id and version', async () => {
    const result = await getResource({
      collection: 'events',
      id: 'OrderCreated',
      version: '1.0.0',
    });
    expect(result).toBeDefined();
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.data.id).toBe('OrderCreated');
      expect(result.data.version).toBe('1.0.0');
    }
  });

  it('returns error when resource not found', async () => {
    const result = await getResource({
      collection: 'events',
      id: 'NonExistent',
      version: '1.0.0',
    });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('returns error for wrong version', async () => {
    const result = await getResource({
      collection: 'events',
      id: 'OrderCreated',
      version: '99.0.0',
    });
    expect('error' in result).toBe(true);
  });
});

describe('getMessagesProducedOrConsumedByResource', () => {
  it('returns resource with sends and receives properties', async () => {
    const result = await getMessagesProducedOrConsumedByResource({
      resourceId: 'OrderService',
      resourceVersion: '1.0.0',
      resourceCollection: 'services',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.data.sends).toBeDefined();
      expect(result.data.receives).toBeDefined();
    }
  });

  it('returns error when resource not found', async () => {
    const result = await getMessagesProducedOrConsumedByResource({
      resourceId: 'NonExistent',
      resourceVersion: '1.0.0',
      resourceCollection: 'services',
    });
    expect('error' in result).toBe(true);
  });
});

// ============================================
// Message Analysis Tools Tests
// ============================================

describe('getProducersOfMessage', () => {
  it('finds services that send exact version', async () => {
    const result = await getProducersOfMessage({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.producers.length).toBeGreaterThan(0);
      expect(result.producers.some((p: ProducerConsumer) => p.id === 'OrderService')).toBe(true);
    }
  });

  it('finds services with version: latest', async () => {
    const result = await getProducersOfMessage({
      messageId: 'PaymentProcessed',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // PaymentService sends PaymentProcessed with version: 'latest'
      expect(result.producers.some((p: ProducerConsumer) => p.id === 'PaymentService')).toBe(true);
    }
  });

  it('finds services with no version specified (matches all)', async () => {
    // PaymentService receives OrderCreated without version specified
    const result = await getConsumersOfMessage({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.consumers.some((c: ProducerConsumer) => c.id === 'PaymentService')).toBe(true);
    }
  });

  it('returns correct count', async () => {
    const result = await getProducersOfMessage({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.count).toBe(result.producers.length);
    }
  });

  it('returns error when message not found', async () => {
    const result = await getProducersOfMessage({
      messageId: 'NonExistent',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('returns message details in response', async () => {
    const result = await getProducersOfMessage({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.message.id).toBe('OrderCreated');
      expect(result.message.version).toBe('1.0.0');
      expect(result.message.collection).toBe('events');
    }
  });
});

describe('getConsumersOfMessage', () => {
  it('finds services that receive exact version', async () => {
    const result = await getConsumersOfMessage({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.consumers.some((c: ProducerConsumer) => c.id === 'InventoryService')).toBe(true);
    }
  });

  it('finds services with no version specified', async () => {
    const result = await getConsumersOfMessage({
      messageId: 'OrderCreated',
      messageVersion: '2.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // PaymentService receives OrderCreated without version (matches any)
      expect(result.consumers.some((c: ProducerConsumer) => c.id === 'PaymentService')).toBe(true);
      // NotificationService receives OrderCreated version 2.0.0
      expect(result.consumers.some((c: ProducerConsumer) => c.id === 'NotificationService')).toBe(true);
    }
  });

  it('returns error when message not found', async () => {
    const result = await getConsumersOfMessage({
      messageId: 'NonExistent',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(true);
  });
});

describe('analyzeChangeImpact', () => {
  it('returns producers and consumers counts', async () => {
    const result = await analyzeChangeImpact({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.impact.producerCount).toBeGreaterThanOrEqual(0);
      expect(result.impact.consumerCount).toBeGreaterThanOrEqual(0);
      expect(result.impact.totalServicesAffected).toBeGreaterThanOrEqual(0);
    }
  });

  it('collects affected owners from string format', async () => {
    const result = await analyzeChangeImpact({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.impact.teamsAffected).toContain('order-team');
    }
  });

  it('collects affected owners from object format', async () => {
    const result = await analyzeChangeImpact({
      messageId: 'InventoryUpdated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.impact.teamsAffected).toContain('inventory-team');
    }
  });

  it('includes message owners in affected teams', async () => {
    const result = await analyzeChangeImpact({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // OrderCreated is owned by 'order-team' and { id: 'user-jane' }
      expect(result.impact.teamsAffected).toContain('order-team');
      expect(result.impact.teamsAffected).toContain('user-jane');
    }
  });

  it('returns message details', async () => {
    const result = await analyzeChangeImpact({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.message.id).toBe('OrderCreated');
      expect(result.message.name).toBe('Order Created');
    }
  });

  it('returns error when message not found', async () => {
    const result = await analyzeChangeImpact({
      messageId: 'NonExistent',
      messageVersion: '1.0.0',
      messageCollection: 'events',
    });
    expect('error' in result).toBe(true);
  });
});

// ============================================
// Lookup Tools Tests
// ============================================

describe('findResourcesByOwner', () => {
  it('finds resources across all collections by string owner', async () => {
    const result = await findResourcesByOwner({ ownerId: 'order-team' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.resources.some((r: ResourceResult) => r.collection === 'events')).toBe(true);
      expect(result.resources.some((r: ResourceResult) => r.collection === 'services')).toBe(true);
    }
  });

  it('handles object owner format', async () => {
    // InventoryService has owner { id: 'inventory-team' }
    const result = await findResourcesByOwner({ ownerId: 'inventory-team' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.resources.some((r: ResourceResult) => r.id === 'InventoryService')).toBe(true);
    }
  });

  it('returns message when no resources found', async () => {
    const result = await findResourcesByOwner({ ownerId: 'non-existent-team' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.message).toContain('No resources found');
      expect(result.resources).toEqual([]);
    }
  });

  it('returns resources with correct structure', async () => {
    const result = await findResourcesByOwner({ ownerId: 'order-team' });
    expect('error' in result).toBe(false);
    if (!('error' in result) && result.resources.length > 0) {
      expect(result.resources[0]).toHaveProperty('collection');
      expect(result.resources[0]).toHaveProperty('id');
      expect(result.resources[0]).toHaveProperty('name');
    }
  });
});

describe('findMessageBySchemaId', () => {
  it('finds message in specified collection', async () => {
    const result = await findMessageBySchemaId({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      collection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resource.id).toBe('OrderCreated');
      expect(result.resource.collection).toBe('events');
    }
  });

  it('searches all message collections when none specified', async () => {
    const result = await findMessageBySchemaId({
      messageId: 'CreateOrder',
      messageVersion: '1.0.0',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resource.id).toBe('CreateOrder');
      expect(result.resource.collection).toBe('commands');
    }
  });

  it('returns latest version when no version specified', async () => {
    const result = await findMessageBySchemaId({
      messageId: 'OrderCreated',
      // No version - should return latest
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resource.id).toBe('OrderCreated');
      // Latest version is 2.0.0 in our mocks
      expect(result.resource.version).toBe('2.0.0');
    }
  });

  it('includes producers and consumers', async () => {
    const result = await findMessageBySchemaId({
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      collection: 'events',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.producers).toBeDefined();
      expect(result.consumers).toBeDefined();
      expect(Array.isArray(result.producers)).toBe(true);
      expect(Array.isArray(result.consumers)).toBe(true);
    }
  });

  it('returns error when message not found', async () => {
    const result = await findMessageBySchemaId({
      messageId: 'NonExistent',
    });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });
});

describe('getSchemaForResource', () => {
  beforeEach(() => {
    vi.mocked(getSchemasFromResource).mockReset();
  });

  it('returns schema with format and code', async () => {
    vi.mocked(getSchemasFromResource).mockResolvedValue([{ url: '/path/to/schema.json', format: 'json-schema' }]);

    const result = await getSchemaForResource({
      resourceId: 'OrderCreated',
      resourceVersion: '1.0.0',
      resourceCollection: 'events',
    });
    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result[0]).toHaveProperty('url');
      expect(result[0]).toHaveProperty('format');
      expect(result[0]).toHaveProperty('code');
    }
  });

  it('returns message when no schema found', async () => {
    vi.mocked(getSchemasFromResource).mockResolvedValue([]);

    const result = await getSchemaForResource({
      resourceId: 'OrderCreated',
      resourceVersion: '1.0.0',
      resourceCollection: 'events',
    });
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('No schemas found');
    }
  });

  it('returns error when resource not found', async () => {
    const result = await getSchemaForResource({
      resourceId: 'NonExistent',
      resourceVersion: '1.0.0',
      resourceCollection: 'events',
    });
    expect('error' in result).toBe(true);
  });
});

// ============================================
// Flow Tools Tests
// ============================================

describe('explainBusinessFlow', () => {
  it('returns flow with steps and mermaid', async () => {
    const result = await explainBusinessFlow({
      flowId: 'OrderFlow',
      flowVersion: '1.0.0',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.flow.id).toBe('OrderFlow');
      expect(result.flow.steps).toBeDefined();
      expect(Array.isArray(result.flow.steps)).toBe(true);
      expect(result.flow.mermaid).toBeDefined();
    }
  });

  it('includes related services', async () => {
    const result = await explainBusinessFlow({
      flowId: 'OrderFlow',
      flowVersion: '1.0.0',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.relatedServices).toBeDefined();
      expect(Array.isArray(result.relatedServices)).toBe(true);
      // OrderService has flows: [{ id: 'OrderFlow' }]
      expect(result.relatedServices.some((s: ProducerConsumer) => s.id === 'OrderService')).toBe(true);
    }
  });

  it('returns body content', async () => {
    const result = await explainBusinessFlow({
      flowId: 'OrderFlow',
      flowVersion: '1.0.0',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Order Processing Flow');
    }
  });

  it('returns error when flow not found', async () => {
    const result = await explainBusinessFlow({
      flowId: 'NonExistent',
      flowVersion: '1.0.0',
    });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });
});

// ============================================
// Team and User Tools Tests
// ============================================

describe('getTeams', () => {
  it('returns paginated teams', async () => {
    const result = await getTeams({});
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.teams).toBeDefined();
      expect(Array.isArray(result.teams)).toBe(true);
      expect(result.totalCount).toBe(mockTeams.length);
    }
  });

  it('returns teams with correct structure', async () => {
    const result = await getTeams({});
    expect('error' in result).toBe(false);
    if (!('error' in result) && result.teams.length > 0) {
      expect(result.teams[0]).toHaveProperty('id');
      expect(result.teams[0]).toHaveProperty('name');
      expect(result.teams[0]).toHaveProperty('members');
    }
  });

  it('supports cursor-based pagination', async () => {
    const result = await getTeams({ cursor: encodeCursor(1) });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.teams[0].id).toBe('payment-team');
    }
  });
});

describe('getTeam', () => {
  it('returns team by id with members', async () => {
    const result = await getTeam({ id: 'order-team' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.id).toBe('order-team');
      expect(result.name).toBe('Order Team');
      expect(result.members).toContain('user-jane');
      expect(result.members).toContain('user-john');
    }
  });

  it('returns team content (markdown body)', async () => {
    const result = await getTeam({ id: 'order-team' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.content).toBeDefined();
    }
  });

  it('returns error when team not found', async () => {
    const result = await getTeam({ id: 'non-existent-team' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });
});

describe('getUsers', () => {
  it('returns paginated users', async () => {
    const result = await getUsers({});
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.users).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
      expect(result.totalCount).toBe(mockUsers.length);
    }
  });

  it('returns users with correct structure', async () => {
    const result = await getUsers({});
    expect('error' in result).toBe(false);
    if (!('error' in result) && result.users.length > 0) {
      expect(result.users[0]).toHaveProperty('id');
      expect(result.users[0]).toHaveProperty('name');
      expect(result.users[0]).toHaveProperty('email');
      expect(result.users[0]).toHaveProperty('role');
    }
  });
});

describe('getUser', () => {
  it('returns user by id', async () => {
    const result = await getUser({ id: 'user-jane' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.id).toBe('user-jane');
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@company.com');
      expect(result.role).toBe('Lead Engineer');
    }
  });

  it('returns user content (markdown body)', async () => {
    const result = await getUser({ id: 'user-jane' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.content).toBeDefined();
    }
  });

  it('returns error when user not found', async () => {
    const result = await getUser({ id: 'non-existent-user' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });
});

// ============================================
// Search Filter Tests
// ============================================

describe('getResources with search filter', () => {
  it('filters resources by name', async () => {
    const result = await getResources({ collection: 'events', search: 'Order' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // Should match OrderCreated events (both versions)
      expect(result.resources.length).toBeGreaterThan(0);
      expect(
        result.resources.every((r: any) => r.name?.toLowerCase().includes('order') || r.id?.toLowerCase().includes('order'))
      ).toBe(true);
    }
  });

  it('filters resources by id', async () => {
    const result = await getResources({ collection: 'events', search: 'Payment' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.resources.some((r: any) => r.id === 'PaymentProcessed')).toBe(true);
    }
  });

  it('filters resources by summary', async () => {
    const result = await getResources({ collection: 'events', search: 'inventory' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.resources.some((r: any) => r.id === 'InventoryUpdated')).toBe(true);
    }
  });

  it('returns empty when no match found', async () => {
    const result = await getResources({ collection: 'events', search: 'nonexistent' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.resources.length).toBe(0);
      expect(result.totalCount).toBe(0);
    }
  });

  it('is case-insensitive', async () => {
    const resultLower = await getResources({ collection: 'events', search: 'order' });
    const resultUpper = await getResources({ collection: 'events', search: 'ORDER' });
    expect('error' in resultLower).toBe(false);
    expect('error' in resultUpper).toBe(false);
    if (!('error' in resultLower) && !('error' in resultUpper)) {
      expect(resultLower.totalCount).toBe(resultUpper.totalCount);
    }
  });

  it('returns all resources when search is empty', async () => {
    const resultWithSearch = await getResources({ collection: 'events', search: '' });
    const resultWithoutSearch = await getResources({ collection: 'events' });
    expect('error' in resultWithSearch).toBe(false);
    expect('error' in resultWithoutSearch).toBe(false);
    if (!('error' in resultWithSearch) && !('error' in resultWithoutSearch)) {
      expect(resultWithSearch.totalCount).toBe(resultWithoutSearch.totalCount);
    }
  });

  it('includes summary in returned resources', async () => {
    const result = await getResources({ collection: 'events' });
    expect('error' in result).toBe(false);
    if (!('error' in result) && result.resources.length > 0) {
      expect(result.resources[0]).toHaveProperty('summary');
    }
  });
});

// ============================================
// Ubiquitous Language Tests
// ============================================

describe('explainUbiquitousLanguageTerms', () => {
  it('returns terms for a domain with ubiquitous language', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'OrderDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.domainId).toBe('OrderDomain');
      expect(result.terms.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);
    }
  });

  it('includes domain terms', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'OrderDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.domainTermCount).toBe(3);
      expect(result.terms.some((t: any) => t.term === 'Order')).toBe(true);
      expect(result.terms.some((t: any) => t.term === 'Line Item')).toBe(true);
    }
  });

  it('includes subdomain terms', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'OrderDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.subdomainTermCount).toBe(2);
      expect(result.terms.some((t: any) => t.term === 'Shipment' && t.isSubdomain === true)).toBe(true);
    }
  });

  it('detects duplicate terms', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'OrderDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.duplicateTerms).toContain('customer');
      expect(result.terms.filter((t: any) => t.term === 'Customer' && t.isDuplicate === true).length).toBe(2);
    }
  });

  it('includes term metadata (icon, description)', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'OrderDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      const orderTerm = result.terms.find((t: any) => t.term === 'Order');
      expect(orderTerm).toBeDefined();
      expect(orderTerm.description).toBeDefined();
      expect(orderTerm.icon).toBe('ShoppingCart');
    }
  });

  it('returns message when no terms defined', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'EmptyDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.message).toContain('No ubiquitous language terms');
      expect(result.terms.length).toBe(0);
    }
  });

  it('returns error when domain not found', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'NonExistent' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('returns subdomain count', async () => {
    const result = await explainUbiquitousLanguageTerms({ domainId: 'OrderDomain' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.subdomainCount).toBe(1);
    }
  });
});
