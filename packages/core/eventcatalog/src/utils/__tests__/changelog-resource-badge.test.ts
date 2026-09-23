import { describe, expect, it } from 'vitest';
import { Bot, DatabaseIcon, Group } from 'lucide-react';
import {
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
  RectangleGroupIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import {
  changelogResourceCollections,
  getChangelogResourceBadge,
  type ChangelogResourceBadge,
} from '../changelog-resource-badge';

const expectedBadges: Record<(typeof changelogResourceCollections)[number], ChangelogResourceBadge> = {
  agents: { content: 'Agent', icon: Bot, textColor: 'gray' },
  events: { content: 'Event', icon: BoltIcon, textColor: 'gray' },
  commands: { content: 'Command', icon: ChatBubbleLeftIcon, textColor: 'gray' },
  queries: { content: 'Query', icon: MagnifyingGlassIcon, textColor: 'gray' },
  services: { content: 'Service', icon: ServerIcon, textColor: 'gray' },
  domains: { content: 'Domain', icon: RectangleGroupIcon, textColor: 'gray' },
  systems: { content: 'System', icon: Group, textColor: 'gray' },
  flows: { content: 'Flow', icon: QueueListIcon, textColor: 'gray' },
  containers: { content: 'Container', icon: DatabaseIcon, textColor: 'gray' },
};

describe('getChangelogResourceBadge', () => {
  it('returns a system badge so system changelog routes can prerender', () => {
    expect(getChangelogResourceBadge('systems')).toEqual({
      content: 'System',
      icon: Group,
      textColor: 'gray',
    });
  });

  it('returns a badge for every collection that prerenders a changelog route', () => {
    for (const collection of changelogResourceCollections) {
      expect(getChangelogResourceBadge(collection)).toEqual(expectedBadges[collection]);
    }
  });

  it('returns undefined for collections that do not prerender changelog routes', () => {
    expect(getChangelogResourceBadge('channels')).toBeUndefined();
    expect(getChangelogResourceBadge('entities')).toBeUndefined();
    expect(getChangelogResourceBadge('data-products')).toBeUndefined();
  });
});
