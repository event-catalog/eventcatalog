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

  it('only allows groups with more than five children to collapse', () => {
    expect(canCollapseGroup(5)).toBe(false);
    expect(canCollapseGroup(6)).toBe(true);
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
