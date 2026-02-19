import type { ResourceGroup } from '@eventcatalog/sdk';
import type { CollectionEntry } from 'astro:content';
import { getLatestVersionInCollectionById } from '@utils/collections/util';
import { buildUrl } from '@utils/url-builder';
import {
  getGroupedResourceDocsByType,
  type ResourceCollection,
  type ResourceDocEntry,
  type ResourceDocCategoryEntry,
} from '@utils/collections/resource-docs';

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
  subtle?: boolean; // Render lightweight styling for nested subgroup headers
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
  nodes: Record<string, NavNode | string>; // Flat map of nodes by key, strings are references to other keys (e.g., unversioned aliases)
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
  diagrams: CollectionEntry<'diagrams'>[];
  resourceDocs: ResourceDocEntry[];
  resourceDocCategories: ResourceDocCategoryEntry[];
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

export const buildAttachmentsSection = (attachments: any[]): NavNode | null => {
  if (!attachments) return null;
  return {
    type: 'group',
    title: 'Attachments',
    icon: 'File',
    pages: attachments.map((attachment) => ({
      type: 'item',
      title: attachment.title,
      href: attachment.url,
    })),
  };
};

export const buildResourceDocsSection = (
  collection: ResourceCollection,
  id: string,
  version: string,
  resourceDocs: ResourceDocEntry[],
  resourceDocCategories: ResourceDocCategoryEntry[]
): NavNode | null => {
  const docsForResource = resourceDocs.filter(
    (doc) => doc.data.resourceCollection === collection && doc.data.resourceId === id && doc.data.resourceVersion === version
  );

  if (docsForResource.length === 0) {
    return null;
  }

  const categoriesForResource = resourceDocCategories.filter(
    (category) =>
      category.data.resourceCollection === collection &&
      category.data.resourceId === id &&
      category.data.resourceVersion === version
  );

  const groupedDocs = getGroupedResourceDocsByType(docsForResource, {
    latestOnly: true,
    categories: categoriesForResource,
  });

  if (groupedDocs.length === 0) {
    return null;
  }

  const typeLabelMap: Record<string, string> = {
    adrs: 'ADR',
    runbooks: 'Runbook',
    contracts: 'Contract',
    troubleshooting: 'Troubleshooting',
    guides: 'Guide',
  };

  const toTypeLabel = (value: string) => {
    if (typeLabelMap[value]) {
      return typeLabelMap[value];
    }

    const normalized = value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return normalized || 'Doc';
  };

  return {
    type: 'group',
    title: 'Documentation',
    icon: 'BookText',
    pages: groupedDocs.map((group) => ({
      type: 'group',
      title: group.label || toTypeLabel(group.type),
      subtle: true,
      pages: group.docs.map((doc) => ({
        type: 'item',
        title: doc.data.title || doc.data.id,
        href: buildUrl(
          `/docs/${collection}/${id}/${version}/${encodeURIComponent(doc.data.type)}/${encodeURIComponent(doc.data.id)}`
        ),
      })),
    })),
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

export const buildDiagramNavItems = (
  diagrams: Array<{ id: string; version?: string }> | undefined,
  allDiagrams: CollectionEntry<'diagrams'>[]
): NavNode[] => {
  if (!diagrams || diagrams.length === 0) return [];

  return diagrams.map((ref) => {
    const diagram = allDiagrams.find(
      (d) => d.data.id === ref.id && (ref.version === 'latest' || !ref.version || d.data.version === ref.version)
    );
    const version = diagram?.data.version || ref.version || 'latest';
    return {
      type: 'item' as const,
      title: diagram?.data.name || ref.id,
      href: buildUrl(`/diagrams/${ref.id}/${version}`),
    };
  });
};
