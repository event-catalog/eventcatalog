import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { buildAgentNode } from '../agent';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const agent = {
  id: 'agents/SupportAgent/index.mdx',
  slug: 'agents/SupportAgent',
  collection: 'agents',
  data: {
    id: 'SupportAgent',
    name: 'Support Agent',
    version: '1.0.0',
    latestVersion: '1.0.0',
    owners: [],
  },
} as unknown as CollectionEntry<'agents'>;

const emptyContext = {
  services: [],
  domains: [],
  events: [],
  commands: [],
  queries: [],
  flows: [],
  containers: [],
  dataProducts: [],
  diagrams: [],
  adrs: [],
  resourceDocs: [],
  resourceDocCategories: [],
} as any;

const titles = (node: ReturnType<typeof buildAgentNode>) =>
  (node.pages || []).map((page) => (typeof page === 'string' ? page : page.title));

describe('buildAgentNode', () => {
  it('keeps the generated sidebar when no custom sidebar is given', () => {
    const owners = [{ collection: 'teams', data: { id: 'support', name: 'Support Team' } }];
    expect(titles(buildAgentNode(agent, owners, emptyContext))).toEqual(['Quick Reference', 'Architecture', 'Owners']);
  });
});

describe('buildAgentNode with a custom sidebar', () => {
  const owners = [{ collection: 'teams', data: { id: 'support', name: 'Support Team' } }];

  it('renders exactly the listed sections, in order', () => {
    const node = buildAgentNode(agent, owners, emptyContext, [], [], {
      sidebar: { sections: ['$owners', '$quick-reference'] },
    });

    expect(titles(node)).toEqual(['Owners', 'Quick Reference']);
  });
});
