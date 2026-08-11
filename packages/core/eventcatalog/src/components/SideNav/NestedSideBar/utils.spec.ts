import { describe, expect, it } from 'vitest';
import { canCollapseGroup, getGroupLabel, isGroupCollapsed } from './utils';

const preferences = (expanded: string[] = []) => ({
  expanded: new Set(expanded),
});

describe('sidebar group presentation', () => {
  it('includes the visible child count in the group label', () => {
    expect(getGroupLabel('Outbound Messages', 10)).toBe('Outbound Messages (10)');
  });

  it.each(['Quick Reference', 'Architecture', 'Resources'])('does not include the child count for %s', (title) => {
    expect(getGroupLabel(title, 10)).toBe(title);
  });

  it('keeps top-level groups expanded', () => {
    expect(canCollapseGroup(6, true)).toBe(false);
  });

  it('only allows nested groups with more than five children to collapse', () => {
    expect(canCollapseGroup(5, false)).toBe(false);
    expect(canCollapseGroup(6, false)).toBe(true);
  });

  it('keeps groups marked as non-collapsible expanded regardless of their size', () => {
    expect(canCollapseGroup(100, false, false)).toBe(false);
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
});
