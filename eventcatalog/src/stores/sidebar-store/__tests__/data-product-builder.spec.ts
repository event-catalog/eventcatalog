import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDataProductNode } from '../builders/data-product';
import type { CollectionEntry } from 'astro:content';

// Mock feature utils
vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
}));

// Mock url-builder
vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const createMockDataProduct = (
  overrides: Partial<CollectionEntry<'data-products'>['data']> = {}
): CollectionEntry<'data-products'> =>
  ({
    id: 'data-products/TestDataProduct/index.mdx',
    slug: 'data-products/TestDataProduct',
    collection: 'data-products',
    data: {
      id: 'TestDataProduct',
      name: 'Test Data Product',
      version: '1.0.0',
      summary: 'A test data product',
      inputs: [],
      outputs: [],
      owners: [],
      ...overrides,
    },
  }) as CollectionEntry<'data-products'>;

const createMockEvent = (id: string, version: string): CollectionEntry<'events'> =>
  ({
    id: `events/${id}/index.mdx`,
    slug: `events/${id}`,
    collection: 'events',
    data: { id, version, name: id },
  }) as CollectionEntry<'events'>;

const createMockCommand = (id: string, version: string): CollectionEntry<'commands'> =>
  ({
    id: `commands/${id}/index.mdx`,
    slug: `commands/${id}`,
    collection: 'commands',
    data: { id, version, name: id },
  }) as CollectionEntry<'commands'>;

const createMockQuery = (id: string, version: string): CollectionEntry<'queries'> =>
  ({
    id: `queries/${id}/index.mdx`,
    slug: `queries/${id}`,
    collection: 'queries',
    data: { id, version, name: id },
  }) as CollectionEntry<'queries'>;

const createMockService = (id: string, version: string): CollectionEntry<'services'> =>
  ({
    id: `services/${id}/index.mdx`,
    slug: `services/${id}`,
    collection: 'services',
    data: { id, version, name: id },
  }) as CollectionEntry<'services'>;

const createMockContainer = (id: string, version: string): CollectionEntry<'containers'> =>
  ({
    id: `containers/${id}/index.mdx`,
    slug: `containers/${id}`,
    collection: 'containers',
    data: { id, version, name: id },
  }) as CollectionEntry<'containers'>;

const createMockChannel = (id: string, version: string): CollectionEntry<'channels'> =>
  ({
    id: `channels/${id}/index.mdx`,
    slug: `channels/${id}`,
    collection: 'channels',
    data: { id, version, name: id },
  }) as CollectionEntry<'channels'>;

const emptyContext = {
  events: [] as CollectionEntry<'events'>[],
  commands: [] as CollectionEntry<'commands'>[],
  queries: [] as CollectionEntry<'queries'>[],
  services: [] as CollectionEntry<'services'>[],
  containers: [] as CollectionEntry<'containers'>[],
  channels: [] as CollectionEntry<'channels'>[],
};

describe('buildDataProductNode', () => {
  describe('basic structure', () => {
    it('returns a NavNode with correct basic properties', () => {
      const dataProduct = createMockDataProduct();
      const result = buildDataProductNode(dataProduct, [], emptyContext);

      expect(result).toMatchObject({
        type: 'item',
        title: 'Test Data Product',
        badge: 'Data Product',
        summary: 'A test data product',
      });
    });

    it('includes Overview link in Quick Reference section', () => {
      const dataProduct = createMockDataProduct();
      const result = buildDataProductNode(dataProduct, [], emptyContext);

      const quickRef = result.pages?.find((p: any) => p.title === 'Quick Reference');
      expect(quickRef).toBeDefined();
      expect(quickRef?.pages).toContainEqual({
        type: 'item',
        title: 'Overview',
        href: '/docs/data-products/TestDataProduct/1.0.0',
      });
    });

    it('includes Architecture section with Map link when visualiser is enabled', () => {
      const dataProduct = createMockDataProduct();
      const result = buildDataProductNode(dataProduct, [], emptyContext);

      const archSection = result.pages?.find((p: any) => p.title === 'Architecture');
      expect(archSection).toBeDefined();
      expect(archSection?.pages).toContainEqual({
        type: 'item',
        title: 'Map',
        href: '/visualiser/data-products/TestDataProduct/1.0.0',
      });
    });
  });

  describe('inputs resolution', () => {
    it('resolves event inputs with plural key (events:)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderCreated', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        events: [createMockEvent('OrderCreated', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      expect(inputsSection).toBeDefined();
      expect(inputsSection?.pages).toContain('events:OrderCreated:1.0.0');
    });

    it('resolves command inputs with plural key (commands:)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'CreateOrder', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        commands: [createMockCommand('CreateOrder', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      expect(inputsSection).toBeDefined();
      expect(inputsSection?.pages).toContain('commands:CreateOrder:1.0.0');
    });

    it('resolves query inputs with plural key (queries:)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'GetOrder', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        queries: [createMockQuery('GetOrder', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      expect(inputsSection).toBeDefined();
      expect(inputsSection?.pages).toContain('queries:GetOrder:1.0.0');
    });

    it('resolves service inputs with singular key (service:)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderService', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        services: [createMockService('OrderService', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      expect(inputsSection).toBeDefined();
      expect(inputsSection?.pages).toContain('service:OrderService:1.0.0');
    });

    it('resolves container inputs with singular key (container:)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderDatabase', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        containers: [createMockContainer('OrderDatabase', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      expect(inputsSection).toBeDefined();
      expect(inputsSection?.pages).toContain('container:OrderDatabase:1.0.0');
    });

    it('resolves channel inputs with singular key (channel:)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderChannel', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        channels: [createMockChannel('OrderChannel', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      expect(inputsSection).toBeDefined();
      expect(inputsSection?.pages).toContain('channel:OrderChannel:1.0.0');
    });

    it('resolves to latest version in collection when no version specified', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderCreated' }], // No version specified
      });
      const context = {
        ...emptyContext,
        events: [createMockEvent('OrderCreated', '1.0.0'), createMockEvent('OrderCreated', '2.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      // Should resolve to the latest version (2.0.0) in the collection
      expect(inputsSection?.pages).toContain('events:OrderCreated:2.0.0');
    });

    it('resolves semver ranges to matching version', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderCreated', version: '^1.0.0' }], // Semver range
      });
      const context = {
        ...emptyContext,
        events: [
          createMockEvent('OrderCreated', '1.0.0'),
          createMockEvent('OrderCreated', '1.2.3'),
          createMockEvent('OrderCreated', '2.0.0'),
        ],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      // ^1.0.0 should match 1.2.3 (highest in range)
      expect(inputsSection?.pages).toContain('events:OrderCreated:1.2.3');
    });

    it('skips unknown resources (not in any collection)', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'UnknownResource', version: '1.0.0' }],
      });

      const result = buildDataProductNode(dataProduct, [], emptyContext);
      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');

      // Inputs section should not exist since all inputs are unknown
      expect(inputsSection).toBeUndefined();
    });

    it('does not render Inputs section when no inputs are defined', () => {
      const dataProduct = createMockDataProduct({ inputs: [] });
      const result = buildDataProductNode(dataProduct, [], emptyContext);

      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');
      expect(inputsSection).toBeUndefined();
    });
  });

  describe('outputs resolution', () => {
    it('resolves event outputs with plural key (events:)', () => {
      const dataProduct = createMockDataProduct({
        outputs: [{ id: 'OrderAnalytics', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        events: [createMockEvent('OrderAnalytics', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const outputsSection = result.pages?.find((p: any) => p.title === 'Outputs');

      expect(outputsSection).toBeDefined();
      expect(outputsSection?.pages).toContain('events:OrderAnalytics:1.0.0');
    });

    it('resolves service outputs with singular key (service:)', () => {
      const dataProduct = createMockDataProduct({
        outputs: [{ id: 'ReportingService', version: '1.0.0' }],
      });
      const context = {
        ...emptyContext,
        services: [createMockService('ReportingService', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const outputsSection = result.pages?.find((p: any) => p.title === 'Outputs');

      expect(outputsSection).toBeDefined();
      expect(outputsSection?.pages).toContain('service:ReportingService:1.0.0');
    });

    it('does not render Outputs section when no outputs are defined', () => {
      const dataProduct = createMockDataProduct({ outputs: [] });
      const result = buildDataProductNode(dataProduct, [], emptyContext);

      const outputsSection = result.pages?.find((p: any) => p.title === 'Outputs');
      expect(outputsSection).toBeUndefined();
    });
  });

  describe('mixed inputs and outputs', () => {
    it('correctly resolves multiple inputs and outputs of different types', () => {
      const dataProduct = createMockDataProduct({
        inputs: [{ id: 'OrderCreated', version: '1.0.0' }, { id: 'PaymentService', version: '2.0.0' }, { id: 'OrderDatabase' }],
        outputs: [
          { id: 'OrderAnalytics', version: '1.0.0' },
          { id: 'OrderChannel', version: '1.0.0' },
        ],
      });
      const context = {
        ...emptyContext,
        events: [createMockEvent('OrderCreated', '1.0.0'), createMockEvent('OrderAnalytics', '1.0.0')],
        services: [createMockService('PaymentService', '2.0.0')],
        containers: [createMockContainer('OrderDatabase', '1.0.0')],
        channels: [createMockChannel('OrderChannel', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);

      const inputsSection = result.pages?.find((p: any) => p.title === 'Inputs');
      expect(inputsSection?.pages).toEqual(
        expect.arrayContaining(['events:OrderCreated:1.0.0', 'service:PaymentService:2.0.0', 'container:OrderDatabase:1.0.0'])
      );

      const outputsSection = result.pages?.find((p: any) => p.title === 'Outputs');
      expect(outputsSection?.pages).toEqual(
        expect.arrayContaining(['events:OrderAnalytics:1.0.0', 'channel:OrderChannel:1.0.0'])
      );
    });
  });

  describe('data contracts (Data Contracts section)', () => {
    it('renders Data Contracts section when outputs have contract field', () => {
      const dataProduct = createMockDataProduct({
        outputs: [
          {
            id: 'OrdersDB',
            version: '1.0.0',
            contract: { path: 'fact-orders-contract.json', name: 'Fact Orders Contract', type: 'json-schema' },
          },
          {
            id: 'PaymentsDB',
            version: '1.0.0',
            contract: { path: 'payments-schema.json', name: 'Payments Schema', type: 'avro' },
          },
        ],
      }) as any;

      const context = {
        ...emptyContext,
        containers: [createMockContainer('OrdersDB', '1.0.0'), createMockContainer('PaymentsDB', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const apiContractsSection = result.pages?.find((p: any) => p.title === 'Data Contracts');

      expect(apiContractsSection).toBeDefined();
      expect(apiContractsSection?.icon).toBe('FileCheck');
      expect(apiContractsSection?.pages).toHaveLength(2);
      expect(apiContractsSection?.pages[0]).toMatchObject({
        type: 'item',
        title: 'Fact Orders Contract (JSON)',
        summary: 'Type: json-schema',
        href: '/schemas/data-products/TestDataProduct/1.0.0?contract=fact-orders-contract.json',
      });
      expect(apiContractsSection?.pages[1]).toMatchObject({
        type: 'item',
        title: 'Payments Schema (JSON)',
        summary: 'Type: avro',
        href: '/schemas/data-products/TestDataProduct/1.0.0?contract=payments-schema.json',
      });
    });

    it('does not render Data Contracts section when no outputs have contract field', () => {
      const dataProduct = createMockDataProduct({
        outputs: [{ id: 'OrdersDB', version: '1.0.0' }],
      });

      const context = {
        ...emptyContext,
        containers: [createMockContainer('OrdersDB', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const apiContractsSection = result.pages?.find((p: any) => p.title === 'Data Contracts');

      expect(apiContractsSection).toBeUndefined();
    });

    it('only includes outputs that have contract field in Data Contracts section', () => {
      const dataProduct = createMockDataProduct({
        outputs: [
          { id: 'OrdersDB', version: '1.0.0', contract: { path: 'orders-contract.json', name: 'Orders Contract' } },
          { id: 'PaymentsDB', version: '1.0.0' }, // No contract
        ],
      }) as any;

      const context = {
        ...emptyContext,
        containers: [createMockContainer('OrdersDB', '1.0.0'), createMockContainer('PaymentsDB', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const apiContractsSection = result.pages?.find((p: any) => p.title === 'Data Contracts');

      expect(apiContractsSection).toBeDefined();
      expect(apiContractsSection?.pages).toHaveLength(1);
      expect(apiContractsSection?.pages[0]).toMatchObject({
        type: 'item',
        title: 'Orders Contract (JSON)',
        href: '/schemas/data-products/TestDataProduct/1.0.0?contract=orders-contract.json',
      });
    });

    it('renders contract without summary when type is not provided', () => {
      const dataProduct = createMockDataProduct({
        outputs: [{ id: 'OrdersDB', version: '1.0.0', contract: { path: 'orders-contract.json', name: 'Orders Contract' } }],
      }) as any;

      const context = {
        ...emptyContext,
        containers: [createMockContainer('OrdersDB', '1.0.0')],
      };

      const result = buildDataProductNode(dataProduct, [], context);
      const apiContractsSection = result.pages?.find((p: any) => p.title === 'Data Contracts');

      expect(apiContractsSection?.pages[0]).toMatchObject({
        type: 'item',
        title: 'Orders Contract (JSON)',
        summary: undefined,
      });
    });
  });

  describe('owners', () => {
    it('includes Owners section when owners are provided', () => {
      const dataProduct = createMockDataProduct({ owners: ['user1'] });
      const owners = [{ id: 'user1', data: { id: 'user1', name: 'User One' }, collection: 'users' }];

      const result = buildDataProductNode(dataProduct, owners as any, emptyContext);
      const ownersSection = result.pages?.find((p: any) => p.title === 'Owners');

      expect(ownersSection).toBeDefined();
    });

    it('does not include Owners section when no owners are provided', () => {
      const dataProduct = createMockDataProduct();
      const result = buildDataProductNode(dataProduct, [], emptyContext);

      const ownersSection = result.pages?.find((p: any) => p.title === 'Owners');
      expect(ownersSection).toBeUndefined();
    });
  });
});
