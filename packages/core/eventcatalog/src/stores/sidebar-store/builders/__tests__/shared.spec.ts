import { describe, expect, it } from 'vitest';
import { withArchitectureDecisionsSection, type NavNode } from '../shared';

describe('withArchitectureDecisionsSection', () => {
  it('adds Decision Records before Owners when both sections exist', () => {
    const node: NavNode = {
      type: 'item',
      title: 'Orders Service',
      pages: [
        { type: 'group', title: 'Quick Reference', pages: [] },
        { type: 'group', title: 'Flows', pages: [] },
        { type: 'group', title: 'Owners', pages: [] },
        { type: 'group', title: 'Code', pages: [] },
      ],
    };

    const resource = {
      collection: 'services',
      data: { id: 'OrdersService', version: '1.0.0' },
    };

    const adr = {
      collection: 'adrs',
      data: {
        id: 'use-events-for-order-updates',
        version: '1.0.0',
        appliesTo: [{ type: 'service', id: 'OrdersService', version: '1.0.0' }],
      },
    };

    const result = withArchitectureDecisionsSection(node, resource as any, [adr as any]);

    expect(result.pages?.map((page) => (typeof page === 'string' ? page : page.title))).toEqual([
      'Quick Reference',
      'Flows',
      'Decision Records',
      'Owners',
      'Code',
    ]);
  });

  it('keeps an overview link when adding Decision Records to href-only nodes', () => {
    const node: NavNode = {
      type: 'item',
      title: 'Dave',
      href: '/docs/users/dave',
    };

    const resource = {
      collection: 'users',
      data: { id: 'dave' },
    };

    const adr = {
      collection: 'adrs',
      data: {
        id: 'use-events-for-order-updates',
        version: '1.0.0',
        appliesTo: [{ type: 'user', id: 'dave' }],
      },
    };

    const result = withArchitectureDecisionsSection(node, resource as any, [adr as any]);

    expect(result.href).toBe('/docs/users/dave');
    expect(result.pages).toEqual([
      {
        type: 'item',
        title: 'Overview',
        href: '/docs/users/dave',
      },
      {
        type: 'group',
        title: 'Decision Records',
        icon: 'BookText',
        pages: ['adr:use-events-for-order-updates:1.0.0'],
      },
    ]);
  });
});
