import type { ResourceGroup } from '@eventcatalog/sdk';
import type { CollectionEntry } from 'astro:content';
import { getLatestVersionInCollectionById } from '@utils/collections/util';
import { buildUrl } from '@utils/url-builder';

/**
 * A child reference can be:
 * - A string key (resolved from nodes map)
 * - An inline node definition
 */
export type ChildRef = string | NavNode;

/**
 * A navigation node (can be section or item)
 */
export type NavNode = {
  type: 'group' | 'item';
  title: string;
  icon?: string; // Lucide icon name
  leftIcon?: string; // Path to SVG icon shown on the left of the label
  href?: string; // URL (for leaf items)
  external?: boolean; // If true, the item will open in a new tab
  pages?: ChildRef[]; // Can mix keys and inline nodes
  visible?: boolean; // If false, hide this node (default: true)
  badge?: string; // Category badge shown in header (e.g., "Domain", "Service", "Message")
  summary?: string; // Short description of the item
};

/**
 * The flat navigation data structure
 */
export type NavigationData = {
  roots: ChildRef[]; // What to show at top level
  nodes: Record<string, NavNode>; // Flat map of all nodes by key
};

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export type ResourceGroupContext = {
  services: CollectionEntry<'services'>[];
  domains: CollectionEntry<'domains'>[];
  events: CollectionEntry<'events'>[];
  commands: CollectionEntry<'commands'>[];
  queries: CollectionEntry<'queries'>[];
  flows: CollectionEntry<'flows'>[];
  containers: CollectionEntry<'containers'>[];
};

export const buildQuickReferenceSection = (items: { title: string; href: string }[]): NavNode => ({
  type: 'group',
  title: 'Quick Reference',
  icon: 'BookOpen',
  pages: items.map((item) => ({
    type: 'item',
    title: item.title,
    href: item.href,
  })),
});

export const buildOwnersSection = (owners: any[]): NavNode | null => {
  if (owners.length === 0) return null;
  return {
    type: 'group',
    title: 'Owners',
    icon: 'Users',
    pages: owners.map((owner) => ({
      type: 'item',
      title: owner?.data.name ?? '',
      href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`),
    })),
    visible: true,
  };
};

export const buildRepositorySection = (repository: { url: string; language: string }): NavNode | null => {
  if (!repository) return null;
  return {
    type: 'group',
    title: 'Code',
    icon: 'Code',
    pages: [
      {
        type: 'item',
        title: repository.url,
        href: repository.url,
      },
    ],
  };
};

export const buildResourceGroupSections = (resourceGroups: ResourceGroup[], context: ResourceGroupContext) => {
  return resourceGroups.map((resourceGroup) => buildResourceGroupSection(resourceGroup, context));
};

const buildResourceGroupSection = (resourceGroup: ResourceGroup, context: ResourceGroupContext) => {
  // Only render resource groups that have a type
  const resourcesWithTypes = resourceGroup.items.filter((item) => item.type !== undefined);

  if (resourcesWithTypes.length === 0) {
    return null;
  }

  // If no version is provided, we need to get the latest version
  const resourcesWithVersions = resourcesWithTypes.map((item) => {
    let collection: any[] = [];

    if (item.type === 'service') collection = context.services;
    else if (item.type === 'domain') collection = context.domains;
    else if (item.type === 'event') collection = context.events;
    else if (item.type === 'command') collection = context.commands;
    else if (item.type === 'query') collection = context.queries;
    else if (item.type === 'flow') collection = context.flows;
    else if (item.type === 'container') collection = context.containers;

    if (item.version === undefined || item.version === 'latest') {
      return { ...item, version: getLatestVersionInCollectionById(collection, item.id as string) };
    }
    return item;
  });

  return {
    type: 'group',
    title: resourceGroup.title,
    icon: 'Box',
    pages: resourcesWithVersions.map((item) => {
      const type = ['event', 'command', 'query'].includes(item.type as string) ? 'message' : item.type;
      return `${type}:${item.id}:${item.version}`;
    }),
  };
};

export const shouldRenderSideBarSection = (resource: any, section: string) => {
  if (!resource.data.detailsPanel) {
    return true;
  }
  return resource.data.detailsPanel[section]?.visible ?? true;
};
