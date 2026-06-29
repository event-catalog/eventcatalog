import { describe, expect, it } from 'vitest';
import { withArchitectureDecisionsSection, type NavNode } from '../shared';

describe('withArchitectureDecisionsSection', () => {
  it('adds Decision Records before Owners when both sections exist', () => {
    const node: NavNode = {
      type: 'item',
      title: 'Orders Service',
      pages: [
        { type: 'group', title: 'Quick Reference', pages: [] },
        { type: 'group', title: 'Appears in flows', pages: [] },
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
      'Appears in flows',
      'Decision Records',
      'Owners',
      'Code',
    ]);
  });

  it('adds Decision Records for a system when an ADR applies to it', () => {
    const node: NavNode = {
      type: 'item',
      title: 'Core Monolith',
      href: '/docs/systems/CoreMonolith/1.0.0',
    };

    const resource = {
      collection: 'systems',
      data: { id: 'CoreMonolith', version: '1.0.0' },
    };

    const adr = {
      collection: 'adrs',
      data: {
        id: 'strangle-the-monolith',
        version: '1.0.0',
        appliesTo: [{ type: 'system', id: 'CoreMonolith', version: '1.0.0' }],
      },
    };

    const result = withArchitectureDecisionsSection(node, resource as any, [adr as any]);

    const decisionRecords = result.pages?.find((page) => typeof page !== 'string' && page.title === 'Decision Records');

    expect(decisionRecords && typeof decisionRecords !== 'string' ? decisionRecords.pages : undefined).toEqual([
      'adr:strangle-the-monolith:1.0.0',
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
        icon: 'ClipboardList',
        pages: ['adr:use-events-for-order-updates:1.0.0'],
      },
    ]);
  });

  it('sorts Decision Records by name then id', () => {
    const node: NavNode = {
      type: 'item',
      title: 'Orders Service',
      href: '/docs/services/OrdersService/1.0.0',
    };

    const resource = {
      collection: 'services',
      data: { id: 'OrdersService', version: '1.0.0' },
    };

    const createAdr = (id: string, name?: string) => ({
      collection: 'adrs',
      data: {
        id,
        name,
        version: '1.0.0',
        appliesTo: [{ type: 'service', id: 'OrdersService', version: '1.0.0' }],
      },
    });

    const result = withArchitectureDecisionsSection(
      node,
      resource as any,
      [
        createAdr('adr-003', 'Store payment authorization'),
        createAdr('adr-002', 'Choose event format'),
        createAdr('adr-001', 'Choose event format'),
        createAdr('adr-004'),
      ] as any
    );

    const decisionRecords = result.pages?.find((page) => typeof page !== 'string' && page.title === 'Decision Records');

    expect(decisionRecords && typeof decisionRecords !== 'string' ? decisionRecords.pages : undefined).toEqual([
      'adr:adr-004:1.0.0',
      'adr:adr-001:1.0.0',
      'adr:adr-002:1.0.0',
      'adr:adr-003:1.0.0',
    ]);
  });
});
