import { describe, it, expect, vi } from 'vitest';
import { buildSystemNode } from '../system';
import type { CollectionEntry } from 'astro:content';

// Mock feature utils
vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

// Mock url-builder
vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const createMockSystem = (overrides: Partial<CollectionEntry<'systems'>['data']> = {}): CollectionEntry<'systems'> =>
  ({
    id: 'systems/CoreMonolith/index.md',
    slug: 'systems/CoreMonolith',
    collection: 'systems',
    data: {
      id: 'CoreMonolith',
      name: 'Core Monolith',
      version: '1.0.0',
      summary: 'The legacy core monolith',
      owners: [],
      ...overrides,
    },
  }) as CollectionEntry<'systems'>;

const createMockService = (id: string, version: string): CollectionEntry<'services'> =>
  ({
    id: `services/${id}/index.mdx`,
    slug: `services/${id}`,
    collection: 'services',
    data: { id, version, name: id },
  }) as CollectionEntry<'services'>;

const createMockFlow = (id: string, version: string): CollectionEntry<'flows'> =>
  ({
    id: `flows/${id}/index.mdx`,
    slug: `flows/${id}`,
    collection: 'flows',
    data: { id, version, name: id, steps: [] },
  }) as unknown as CollectionEntry<'flows'>;

const createMockEntity = (id: string, version: string, name?: string): CollectionEntry<'entities'> =>
  ({
    id: `entities/${id}/index.mdx`,
    slug: `entities/${id}`,
    collection: 'entities',
    data: { id, version, name: name ?? id },
  }) as unknown as CollectionEntry<'entities'>;

const createMockContainer = (id: string, version: string): CollectionEntry<'containers'> =>
  ({
    id: `containers/${id}/index.mdx`,
    slug: `containers/${id}`,
    collection: 'containers',
    data: { id, version, name: id },
  }) as unknown as CollectionEntry<'containers'>;

const createMockDiagram = (id: string, version: string, name?: string): CollectionEntry<'diagrams'> =>
  ({
    id: `diagrams/${id}/index.mdx`,
    slug: `diagrams/${id}`,
    collection: 'diagrams',
    data: { id, version, name: name ?? id },
  }) as unknown as CollectionEntry<'diagrams'>;

const emptyContext = {
  events: [] as CollectionEntry<'events'>[],
  commands: [] as CollectionEntry<'commands'>[],
  queries: [] as CollectionEntry<'queries'>[],
  services: [] as CollectionEntry<'services'>[],
  containers: [] as CollectionEntry<'containers'>[],
  channels: [] as CollectionEntry<'channels'>[],
  diagrams: [] as CollectionEntry<'diagrams'>[],
  resourceDocs: [],
  resourceDocCategories: [],
} as any;

// Services and Data Stores are nested as subtle subgroups under a top-level "Resources" group.
const findResourcesSection = (result: any) => (result.pages as any[])?.find((p: any) => p.title === 'Resources');
const findResourceSubsection = (result: any, title: string) =>
  (findResourcesSection(result)?.pages as any[])?.find((p: any) => p.title === title);

describe('buildSystemNode', () => {
  describe('basic structure', () => {
    it('returns a NavNode with correct basic properties', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      expect(result).toMatchObject({
        type: 'item',
        title: 'Core Monolith',
        badge: 'System',
        summary: 'The legacy core monolith',
      });
    });

    it('includes Overview link in Quick Reference section', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const quickRef = (result.pages as any[])?.find((p: any) => p.title === 'Quick Reference');
      expect(quickRef).toBeDefined();
      expect((quickRef as any)?.pages).toContainEqual({
        type: 'item',
        title: 'Overview',
        href: '/docs/systems/CoreMonolith/1.0.0',
      });
    });

    it('does not include a Changelog link when changelog is disabled', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const quickRef = (result.pages as any[])?.find((p: any) => p.title === 'Quick Reference');
      expect((quickRef as any)?.pages).not.toContainEqual(
        expect.objectContaining({ href: '/docs/systems/CoreMonolith/1.0.0/changelog' })
      );
    });
  });

  describe('services', () => {
    it('renders a Services group with resolved service refs', () => {
      const system = createMockSystem({
        services: [createMockService('OrdersService', '1.0.0'), createMockService('PaymentService', '2.0.0')] as any,
      });

      const result = buildSystemNode(system, [], emptyContext);
      const servicesSection = findResourceSubsection(result, 'Services');

      expect(servicesSection).toMatchObject({
        type: 'group',
        title: 'Services',
        subtle: true,
        icon: 'Server',
        pages: ['service:OrdersService:1.0.0', 'service:PaymentService:2.0.0'],
      });
    });

    it('does not render a Services group when there are no services', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const servicesSection = findResourceSubsection(result, 'Services');
      expect(servicesSection).toBeUndefined();
    });

    it('does not render a Services group when the details panel hides services', () => {
      const system = createMockSystem({
        services: [createMockService('OrdersService', '1.0.0')] as any,
        detailsPanel: { services: { visible: false } },
      } as any);

      const result = buildSystemNode(system, [], emptyContext);
      const servicesSection = findResourceSubsection(result, 'Services');
      expect(servicesSection).toBeUndefined();
    });
  });

  describe('flows', () => {
    it('renders a Flows group with resolved flow refs', () => {
      const system = createMockSystem({
        flows: [createMockFlow('OrderFlow', '1.0.0'), createMockFlow('PaymentFlow', '2.0.0')] as any,
      });

      const result = buildSystemNode(system, [], emptyContext);
      const flowsSection = findResourceSubsection(result, 'Flows');

      expect(flowsSection).toMatchObject({
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: ['flow:OrderFlow:1.0.0', 'flow:PaymentFlow:2.0.0'],
      });
    });

    it('does not render a Flows group when there are no flows', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const flowsSection = findResourceSubsection(result, 'Flows');
      expect(flowsSection).toBeUndefined();
    });

    it('does not render a Flows group when the details panel hides flows', () => {
      const system = createMockSystem({
        flows: [createMockFlow('OrderFlow', '1.0.0')] as any,
        detailsPanel: { flows: { visible: false } },
      } as any);

      const result = buildSystemNode(system, [], emptyContext);
      const flowsSection = findResourceSubsection(result, 'Flows');
      expect(flowsSection).toBeUndefined();
    });
  });

  describe('entities', () => {
    it('renders an Entities group with resolved entity refs', () => {
      const system = createMockSystem({
        entities: [createMockEntity('Order', '1.0.0', 'Order'), createMockEntity('Payment', '2.0.0', 'Payment')] as any,
      });

      const result = buildSystemNode(system, [], emptyContext);
      const entitiesSection = (result.pages as any[])?.find((p: any) => p.title === 'Entities');

      expect(entitiesSection).toMatchObject({
        type: 'group',
        title: 'Entities',
        icon: 'Box',
        pages: [
          { type: 'item', title: 'Order', href: '/docs/entities/Order/1.0.0' },
          { type: 'item', title: 'Payment', href: '/docs/entities/Payment/2.0.0' },
        ],
      });
    });

    it('does not render an Entities group when there are no entities', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const entitiesSection = (result.pages as any[])?.find((p: any) => p.title === 'Entities');
      expect(entitiesSection).toBeUndefined();
    });

    it('does not render an Entities group when the details panel hides entities', () => {
      const system = createMockSystem({
        entities: [createMockEntity('Order', '1.0.0')] as any,
        detailsPanel: { entities: { visible: false } },
      } as any);

      const result = buildSystemNode(system, [], emptyContext);
      const entitiesSection = (result.pages as any[])?.find((p: any) => p.title === 'Entities');
      expect(entitiesSection).toBeUndefined();
    });
  });

  describe('data stores (containers)', () => {
    it('renders a Data Stores group with resolved container node refs', () => {
      const system = createMockSystem({
        containers: [createMockContainer('orders-db', '1.0.0'), createMockContainer('payments-db', '2.0.0')] as any,
      });

      const result = buildSystemNode(system, [], emptyContext);
      const dataStoresSection = findResourceSubsection(result, 'Data Stores');

      expect(dataStoresSection).toMatchObject({
        type: 'group',
        title: 'Data Stores',
        subtle: true,
        icon: 'Database',
        pages: ['container:orders-db:1.0.0', 'container:payments-db:2.0.0'],
      });
    });

    it('does not render a Data Stores group when there are no containers', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const dataStoresSection = findResourceSubsection(result, 'Data Stores');
      expect(dataStoresSection).toBeUndefined();
    });

    it('does not render a Data Stores group when the details panel hides containers', () => {
      const system = createMockSystem({
        containers: [createMockContainer('orders-db', '1.0.0')] as any,
        detailsPanel: { containers: { visible: false } },
      } as any);

      const result = buildSystemNode(system, [], emptyContext);
      const dataStoresSection = findResourceSubsection(result, 'Data Stores');
      expect(dataStoresSection).toBeUndefined();
    });
  });

  describe('diagrams', () => {
    it('renders a Diagrams group with resolved diagram links', () => {
      const system = createMockSystem({ diagrams: [{ id: 'target-architecture', version: '1.0.0' }] as any });
      const context = { ...emptyContext, diagrams: [createMockDiagram('target-architecture', '1.0.0', 'Target Architecture')] };

      const result = buildSystemNode(system, [], context);
      const diagramsSection = (result.pages as any[])?.find((p: any) => p.title === 'Diagrams');

      expect(diagramsSection).toMatchObject({
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
      });
      expect((diagramsSection as any)?.pages).toContainEqual({
        type: 'item',
        title: 'Target Architecture',
        href: '/diagrams/target-architecture/1.0.0',
      });
    });

    it('does not render a Diagrams group when there are no diagrams', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const diagramsSection = (result.pages as any[])?.find((p: any) => p.title === 'Diagrams');
      expect(diagramsSection).toBeUndefined();
    });

    it('does not render a Diagrams group when the details panel hides diagrams', () => {
      const system = createMockSystem({
        diagrams: [{ id: 'target-architecture', version: '1.0.0' }] as any,
        detailsPanel: { diagrams: { visible: false } },
      } as any);
      const context = { ...emptyContext, diagrams: [createMockDiagram('target-architecture', '1.0.0')] };

      const result = buildSystemNode(system, [], context);
      const diagramsSection = (result.pages as any[])?.find((p: any) => p.title === 'Diagrams');
      expect(diagramsSection).toBeUndefined();
    });
  });

  describe('owners', () => {
    it('includes Owners section when owners are provided', () => {
      const system = createMockSystem({ owners: [{ id: 'user1' }] as any });
      const owners = [{ id: 'user1', data: { id: 'user1', name: 'User One' }, collection: 'users' }];

      const result = buildSystemNode(system, owners as any, emptyContext);
      const ownersSection = (result.pages as any[])?.find((p: any) => p.title === 'Owners');

      expect(ownersSection).toBeDefined();
    });

    it('does not include Owners section when no owners are provided', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const ownersSection = (result.pages as any[])?.find((p: any) => p.title === 'Owners');
      expect(ownersSection).toBeUndefined();
    });
  });

  describe('repository', () => {
    it('includes a Code section when a repository is configured', () => {
      const system = createMockSystem({ repository: { url: 'https://github.com/acme/monolith', language: 'TypeScript' } });
      const result = buildSystemNode(system, [], emptyContext);

      const repositorySection = (result.pages as any[])?.find((p: any) => p.title === 'Code');
      expect(repositorySection).toBeDefined();
    });

    it('does not include a Code section when no repository is configured', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const repositorySection = (result.pages as any[])?.find((p: any) => p.title === 'Code');
      expect(repositorySection).toBeUndefined();
    });
  });

  describe('attachments', () => {
    it('does not include an Attachments section when no attachments are provided', () => {
      const system = createMockSystem();
      const result = buildSystemNode(system, [], emptyContext);

      const attachmentsSection = (result.pages as any[])?.find((p: any) => p.title === 'Attachments');
      expect(attachmentsSection).toBeUndefined();
    });
  });
});
