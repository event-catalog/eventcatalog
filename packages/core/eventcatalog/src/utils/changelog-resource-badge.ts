import { ArrowsRightLeftIcon } from '@heroicons/react/20/solid';
import {
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
  RectangleGroupIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { Bot, Box, ClipboardList, DatabaseIcon, Group, Package } from 'lucide-react';
import type { PageTypes } from '@types';

export type ChangelogResourceBadge = {
  content: string;
  icon: any;
  textColor: 'gray';
};

// Every collection that prerenders a changelog route needs a badge. A missing
// entry used to return undefined and crash static builds in Badge.astro.
// This list must include every collection whose sidebar emits a changelog link.
export const changelogResourceCollections = [
  'agents',
  'events',
  'commands',
  'queries',
  'services',
  'domains',
  'systems',
  'flows',
  'containers',
  'channels',
  'entities',
  'adrs',
  'data-products',
] as const satisfies readonly PageTypes[];

export type ChangelogResourceCollection = (typeof changelogResourceCollections)[number];

const changelogResourceBadges: Record<ChangelogResourceCollection, ChangelogResourceBadge> = {
  agents: { content: 'Agent', icon: Bot, textColor: 'gray' },
  events: { content: 'Event', icon: BoltIcon, textColor: 'gray' },
  commands: { content: 'Command', icon: ChatBubbleLeftIcon, textColor: 'gray' },
  queries: { content: 'Query', icon: MagnifyingGlassIcon, textColor: 'gray' },
  services: { content: 'Service', icon: ServerIcon, textColor: 'gray' },
  domains: { content: 'Domain', icon: RectangleGroupIcon, textColor: 'gray' },
  systems: { content: 'System', icon: Group, textColor: 'gray' },
  flows: { content: 'Flow', icon: QueueListIcon, textColor: 'gray' },
  containers: { content: 'Container', icon: DatabaseIcon, textColor: 'gray' },
  channels: { content: 'Channel', icon: ArrowsRightLeftIcon, textColor: 'gray' },
  entities: { content: 'Entity', icon: Box, textColor: 'gray' },
  adrs: { content: 'Decision Record', icon: ClipboardList, textColor: 'gray' },
  'data-products': { content: 'Data Product', icon: Package, textColor: 'gray' },
};

export const isChangelogResourceCollection = (collection: string): collection is ChangelogResourceCollection =>
  (changelogResourceCollections as readonly string[]).includes(collection);

export const getChangelogResourceBadge = (collection: string): ChangelogResourceBadge | undefined => {
  if (!isChangelogResourceCollection(collection)) return undefined;
  return changelogResourceBadges[collection];
};
