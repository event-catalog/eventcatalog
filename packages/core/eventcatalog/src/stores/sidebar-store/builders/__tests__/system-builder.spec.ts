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

const emptyContext = {
  events: [] as CollectionEntry<'events'>[],
  commands: [] as CollectionEntry<'commands'>[],
  queries: [] as CollectionEntry<'queries'>[],
  services: [] as CollectionEntry<'services'>[],
  containers: [] as CollectionEntry<'containers'>[],
  channels: [] as CollectionEntry<'channels'>[],
  resourceDocs: [],
  resourceDocCategories: [],
} as any;

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
