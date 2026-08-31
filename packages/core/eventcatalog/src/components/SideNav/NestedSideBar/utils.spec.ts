import { describe, expect, it } from 'vitest';
import {
  canCollapseGroup,
  createSectionCollapsePreferences,
  findNodeKeyByUrl,
  getDefaultCollapsedState,
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
