import { describe, expect, it } from 'vitest';
import type { NavigationData } from '@stores/sidebar-store/state';
import {
  buildSidebarSnapshot,
  canCollapseGroup,
  createSectionCollapsePreferences,
  findNodeKeyByUrl,
  getStackForUrl,
  getDefaultCollapsedState,
  hidesDefaultItemIcon,
  isGroupCollapsed,
  toggleGroupCollapsed,
} from './utils';

const preferences = (expanded: string[] = [], collapsed: string[] = []) => createSectionCollapsePreferences(expanded, collapsed);

describe('sidebar group presentation', () => {
  it('keeps root-level groups expanded', () => {
    expect(canCollapseGroup(true)).toBe(false);
  });

  it('lets every group inside a resource sidebar collapse, whatever its size', () => {
    expect(canCollapseGroup(false)).toBe(true);
    expect(canCollapseGroup(false)).toBe(true);
  });

  it('keeps groups marked as non-collapsible expanded regardless of their size', () => {
    expect(canCollapseGroup(false, false)).toBe(false);
  });

  it('starts long lists collapsed and short ones open unless told otherwise', () => {
    expect(getDefaultCollapsedState(5)).toBe(false);
    expect(getDefaultCollapsedState(6)).toBe(true);
    expect(getDefaultCollapsedState(6, false)).toBe(false);
    expect(getDefaultCollapsedState(2, true)).toBe(true);
  });

  it('always allows collapsing when an explicit collapsed state is set, overriding every other rule', () => {
    expect(canCollapseGroup(false, true, true)).toBe(true);
    expect(canCollapseGroup(false, true, false)).toBe(true);
    expect(canCollapseGroup(true, false, true)).toBe(true);
  });
});

describe('isGroupCollapsed', () => {
  it('keeps groups without a caret expanded', () => {
    expect(isGroupCollapsed(false, 'group-1', preferences())).toBe(false);
  });

  it('collapses expandable groups by default', () => {
    expect(isGroupCollapsed(true, 'outbound-messages', preferences())).toBe(true);
  });

  it('uses an explicit expanded preference', () => {
    expect(isGroupCollapsed(true, 'outbound-messages', preferences(['outbound-messages']))).toBe(false);
  });

  it('starts expanded when the group defaults to expanded, until the user collapses it', () => {
    expect(isGroupCollapsed(true, 'owners', preferences(), false)).toBe(false);
    expect(isGroupCollapsed(true, 'owners', preferences([], ['owners']), false)).toBe(true);
  });
});

describe('toggleGroupCollapsed', () => {
  it('records the user overriding a collapsed-by-default group, then clears it on the way back', () => {
    const opened = toggleGroupCollapsed('g', preferences());
    expect([...opened.expanded]).toEqual(['g']);
    expect(opened.collapsed.size).toBe(0);

    const closedAgain = toggleGroupCollapsed('g', opened);
    expect(closedAgain.expanded.size).toBe(0);
    expect([...closedAgain.collapsed]).toEqual(['g']);
  });

  it('records the user overriding an expanded-by-default group', () => {
    const closed = toggleGroupCollapsed('g', preferences(), false);
    expect([...closed.collapsed]).toEqual(['g']);
    expect(isGroupCollapsed(true, 'g', closed, false)).toBe(true);

    const reopened = toggleGroupCollapsed('g', closed, false);
    expect(reopened.collapsed.size).toBe(0);
    expect([...reopened.expanded]).toEqual(['g']);
  });

  it('does not mutate the previous preferences', () => {
    const before = preferences();
    toggleGroupCollapsed('g', before);
    expect(before.expanded.size).toBe(0);
    expect(before.collapsed.size).toBe(0);
  });
});

describe('findNodeKeyByUrl', () => {
  const channelKey = 'channel:product-events:1.0.0';
  const nodes = { [channelKey]: {} };
  const nodeLookup = new Map([['channel:product-events', channelKey]]);

  it('selects the channel sidebar for channel documentation', () => {
    expect(findNodeKeyByUrl('/docs/channels/product-events/1.0.0', nodes, nodeLookup)).toBe(channelKey);
  });

  it('keeps the channel sidebar selected on the channel map', () => {
    expect(findNodeKeyByUrl('/visualiser/channels/product-events/1.0.0', nodes, nodeLookup)).toBe(channelKey);
  });

  it('falls back to the available channel version', () => {
    expect(findNodeKeyByUrl('/docs/channels/product-events/latest', nodes, nodeLookup)).toBe(channelKey);
  });
});

describe('sidebar snapshot for a page', () => {
  const data: NavigationData = {
    roots: ['list:domains'],
    nodes: {
      'list:domains': { type: 'group', title: 'Domains', pages: ['domain:orders'] },
      'domain:orders': 'domain:orders:1.0.0',
      'domain:orders:1.0.0': {
        type: 'item',
        title: 'Orders',
        badge: 'Domain',
        pages: [
          { type: 'group', title: 'Overview', pages: [{ type: 'item', title: 'Overview', href: '/docs/domains/orders/1.0.0' }] },
          {
            type: 'group',
            title: 'Services',
            pages: ['service:inventory:1.0.0', { type: 'group', title: 'Nested', pages: ['service:billing'] }],
          },
          'event:order-placed:1.0.0',
        ],
      },
      'service:inventory:1.0.0': { type: 'item', title: 'Inventory', pages: ['event:stock-reserved:1.0.0'] },
      'service:billing': 'service:billing:2.0.0',
      'service:billing:2.0.0': { type: 'item', title: 'Billing', href: '/docs/services/billing/2.0.0' },
      'event:order-placed:1.0.0': { type: 'item', title: 'Order placed', href: '/docs/events/order-placed/1.0.0' },
      'event:stock-reserved:1.0.0': { type: 'item', title: 'Stock reserved', href: '/docs/events/stock-reserved/1.0.0' },
    },
  };

  it('shows the root level on the homepage', () => {
    expect(getStackForUrl('/', data).map((level) => level.key)).toEqual([null]);
  });

  it("shows a resource's own level on its pages", () => {
    const stack = getStackForUrl('/docs/domains/orders/1.0.0', data);
    expect(stack.map((level) => level.key)).toEqual([null, 'domain:orders:1.0.0']);
    expect(stack[1]).toMatchObject({ title: 'Orders', badge: 'Domain' });
  });

  it('shows the root level for pages without their own sidebar', () => {
    expect(getStackForUrl('/docs/events/order-placed/1.0.0', data).map((level) => level.key)).toEqual([null]);
    expect(getStackForUrl('/discover/events', data).map((level) => level.key)).toEqual([null]);
  });

  it('keeps only the nodes the current level shows, including inside its groups', () => {
    const snapshot = buildSidebarSnapshot(data, '/docs/domains/orders/1.0.0');
    expect(Object.keys(snapshot.data.nodes).sort()).toEqual([
      'domain:orders:1.0.0',
      'event:order-placed:1.0.0',
      'service:billing',
      'service:billing:2.0.0',
      'service:inventory:1.0.0',
    ]);
  });

  it('keeps the root lists and their contents on the homepage', () => {
    const snapshot = buildSidebarSnapshot(data, '/');
    expect(snapshot.stack).toHaveLength(1);
    expect(Object.keys(snapshot.data.nodes).sort()).toEqual(['domain:orders', 'domain:orders:1.0.0', 'list:domains']);
  });
});

describe('sidebar item icons', () => {
  it('hides the icon of items whose group heading already shows it, e.g. events listed under Events', () => {
    expect(
      hidesDefaultItemIcon(
        { type: 'group', title: 'Events', icon: 'Zap' },
        { type: 'item', title: 'Order Created', icon: 'Zap' },
        false
      )
    ).toBe(true);
  });

  it('hides the icon of items in a list that already shows it, e.g. channels listed under Channels', () => {
    expect(
      hidesDefaultItemIcon(
        { type: 'item', title: 'Channels', icon: 'ArrowRightLeft' },
        { type: 'item', title: 'Orders Queue', icon: 'ArrowRightLeft' },
        false
      )
    ).toBe(true);
  });

  it('keeps the icon of items whose type differs from their group heading', () => {
    expect(
      hidesDefaultItemIcon(
        { type: 'group', title: 'Sends', icon: 'Mail' },
        { type: 'item', title: 'Order Created', icon: 'Zap' },
        false
      )
    ).toBe(false);
  });

  it('hides the icon of every item under a nested group', () => {
    expect(
      hidesDefaultItemIcon(
        { type: 'group', title: 'Events', icon: 'Zap' },
        { type: 'item', title: 'Order Created', icon: 'Mail' },
        true
      )
    ).toBe(true);
  });
});
