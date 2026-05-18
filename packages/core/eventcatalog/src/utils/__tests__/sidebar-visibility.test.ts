import { describe, expect, it } from 'vitest';
import { filterSidebarItems, isSidebarItemVisible } from '@utils/sidebar-visibility';

describe('sidebar visibility', () => {
  it('shows items by default', () => {
    expect(isSidebarItemVisible({ id: '/directory/users' })).toBe(true);
  });

  it('uses the item default when no user configuration matches', () => {
    expect(isSidebarItemVisible({ id: '/docs/custom', visible: false })).toBe(false);
  });

  it('hides items by exact id', () => {
    expect(isSidebarItemVisible({ id: '/directory/users' }, [{ id: '/directory/users', visible: false }])).toBe(false);
  });

  it('uses aliases so legacy group ids can hide refactored sidebar items', () => {
    const items = [
      { id: '/directory/teams', aliases: ['/directory'] },
      { id: '/directory/users', aliases: ['/directory'] },
      { id: '/discover/events', aliases: ['/discover'] },
    ];

    expect(filterSidebarItems(items, [{ id: '/directory', visible: false }])).toEqual([
      { id: '/discover/events', aliases: ['/discover'] },
    ]);
  });

  it('lets exact item configuration override a matching alias', () => {
    expect(
      isSidebarItemVisible({ id: '/directory/users', aliases: ['/directory'] }, [
        { id: '/directory', visible: false },
        { id: '/directory/users', visible: true },
      ])
    ).toBe(true);
  });
});
