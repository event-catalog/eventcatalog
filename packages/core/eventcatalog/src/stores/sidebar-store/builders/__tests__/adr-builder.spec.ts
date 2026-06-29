import { describe, it, expect, vi } from 'vitest';
import { buildAdrNode } from '../adr';
import type { Adr } from '@utils/collections/adrs';

// Mock feature utils
vi.mock('@utils/feature', () => ({
  isChangelogEnabled: () => false,
}));

// Mock url-builder
vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const createMockAdr = (overrides: Partial<Adr['data']> = {}): Adr =>
  ({
    id: 'adrs/strangle-the-monolith/index.md',
    slug: 'adrs/strangle-the-monolith',
    collection: 'adrs',
    data: {
      id: 'strangle-the-monolith',
      name: 'Strangle the monolith',
      version: '1.0.0',
      status: 'accepted',
      date: new Date('2026-01-01'),
      ...overrides,
    },
  }) as Adr;

const createMockSystem = (id: string, version: string) =>
  ({
    id: `systems/${id}/index.mdx`,
    slug: `systems/${id}`,
    collection: 'systems',
    data: { id, version, name: id },
  }) as any;

const emptyContext = {
  agents: [],
  services: [],
  domains: [],
  systems: [],
  events: [],
  commands: [],
  queries: [],
  flows: [],
  channels: [],
  containers: [],
  entities: [],
  dataProducts: [],
  diagrams: [],
  adrs: [],
  users: [],
  teams: [],
  resourceDocs: [],
  resourceDocCategories: [],
} as any;

describe('buildAdrNode', () => {
  describe('applies to', () => {
    it('resolves a system that the decision record applies to', () => {
      const adr = createMockAdr({
        appliesTo: [{ type: 'system', id: 'CoreMonolith', version: '1.0.0' }],
      });

      const context = { ...emptyContext, systems: [createMockSystem('CoreMonolith', '1.0.0')], adrs: [adr] };
      const result = buildAdrNode(adr, [], [], context);

      const appliesToSection = (result.pages as any[])?.find((p: any) => p.title === 'Applies to');

      expect(appliesToSection).toMatchObject({
        type: 'group',
        title: 'Applies to',
        icon: 'GitBranch',
        pages: ['system:CoreMonolith:1.0.0'],
      });
    });

    it('does not render an Applies to section when the referenced system is not in the catalog', () => {
      const adr = createMockAdr({
        appliesTo: [{ type: 'system', id: 'MissingSystem', version: '1.0.0' }],
      });

      const context = { ...emptyContext, adrs: [adr] };
      const result = buildAdrNode(adr, [], [], context);

      const appliesToSection = (result.pages as any[])?.find((p: any) => p.title === 'Applies to');
      expect(appliesToSection).toBeUndefined();
    });
  });
});
