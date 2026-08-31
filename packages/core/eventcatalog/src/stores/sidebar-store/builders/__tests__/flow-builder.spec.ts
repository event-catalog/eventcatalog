import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { buildFlowNode } from '../flow';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const service = {
  id: 'services/OrderService/index.mdx',
  collection: 'services',
  data: { id: 'OrderService', name: 'Order Service', version: '1.0.0' },
};

const flow = {
  id: 'flows/Checkout/index.mdx',
  slug: 'flows/Checkout',
  collection: 'flows',
  data: {
    id: 'Checkout',
    name: 'Checkout',
    version: '1.0.0',
    steps: [{ id: 'place-order', title: 'Place order', service: { id: 'OrderService', version: '1.0.0' } }],
  },
} as unknown as CollectionEntry<'flows'>;

const context = {
  services: [service],
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

const titles = (node: ReturnType<typeof buildFlowNode>) =>
  (node.pages || []).map((page) => (typeof page === 'string' ? page : page.title));

describe('buildFlowNode', () => {
  it('keeps the generated sidebar when no custom sidebar is given', () => {
    expect(titles(buildFlowNode(flow, context))).toEqual(['Quick Reference', 'Architecture', 'Services']);
  });
});

describe('buildFlowNode with a custom sidebar', () => {
  it('renders exactly the listed sections, in order', () => {
    const node = buildFlowNode(flow, context, { sidebar: { sections: ['$services', '$quick-reference'] } });

    expect(titles(node)).toEqual(['Services', 'Quick Reference']);
    expect(node.pages?.[0]).toEqual({ type: 'group', title: 'Services', icon: 'Server', pages: ['service:OrderService:1.0.0'] });
  });
});
