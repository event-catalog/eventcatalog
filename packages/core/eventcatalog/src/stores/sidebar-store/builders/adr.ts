import { buildUrl } from '@utils/url-builder';
import {
  getAdrRelationships,
  getAdrNodeKey,
  getAdrResourceNodeKey,
  resolveAdrPointers,
  type Adr,
  type AdrResource,
} from '@utils/collections/adrs';
import { collectionToResourceMap, createVersionedMap, findInMap } from '@utils/collections/util';
import type { ChildRef, NavNode, ResourceGroupContext } from './shared';
import {
  buildAttachmentsSection,
  buildOwnersSection,
  buildQuickReferenceSection,
  buildRepositorySection,
  shouldRenderSideBarSection,
} from './shared';
import { isChangelogEnabled } from '@utils/feature';

const firstClassResourceCollections = [
  'agents',
  'services',
  'events',
  'commands',
  'queries',
  'flows',
  'channels',
  'domains',
  'systems',
  'users',
  'teams',
  'containers',
  'entities',
  'diagrams',
  'data-products',
] as const;

const getCollectionForAdrResourceType = (type: string) => {
  const match = Object.entries(collectionToResourceMap).find(([, resourceType]) => resourceType === type);
  return match?.[0];
};

const getResourcesForCollection = (collection: string, context: ResourceGroupContext): AdrResource[] => {
  const resourcesByCollection: Partial<Record<(typeof firstClassResourceCollections)[number], AdrResource[]>> = {
    agents: context.agents || [],
    services: context.services,
    events: context.events,
    commands: context.commands,
    queries: context.queries,
    flows: context.flows,
    channels: context.channels || [],
    domains: context.domains,
    systems: context.systems || [],
    users: context.users || [],
    teams: context.teams || [],
    containers: context.containers,
    entities: context.entities || [],
    diagrams: context.diagrams,
    'data-products': context.dataProducts,
  };

  return resourcesByCollection[collection as (typeof firstClassResourceCollections)[number]] || [];
};

const resolveAppliedResourceRefs = (adr: Adr, context: ResourceGroupContext) => {
  return (adr.data.appliesTo || [])
    .map((pointer) => {
      const collection = getCollectionForAdrResourceType(pointer.type);
      if (!collection) return undefined;

      const resourceMap = createVersionedMap(getResourcesForCollection(collection, context) as any[]);
      const resource = findInMap(resourceMap, pointer.id, pointer.version) as AdrResource | undefined;
      return resource ? getAdrResourceNodeKey(resource) : undefined;
    })
    .filter((ref): ref is string => !!ref);
};

const buildAdrRelationshipSection = (title: string, icon: string, refs: Adr[]): NavNode | null => {
  if (refs.length === 0) return null;

  return {
    type: 'group',
    title,
    icon,
    pages: refs.map(getAdrNodeKey),
  };
};

const buildDecisionMakersSection = (decisionMakers: any[]): NavNode | null => {
  if (decisionMakers.length === 0) return null;

  return {
    type: 'group',
    title: 'Decision makers',
    icon: 'UserCheck',
    pages: decisionMakers.map((owner) => ({
      type: 'item',
      title: owner?.data.name ?? '',
      href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`),
    })),
  };
};

export const buildAdrNode = (adr: Adr, owners: any[], decisionMakers: any[], context: ResourceGroupContext): NavNode => {
  const relationships = getAdrRelationships(adr, context.adrs);
  const appliesToRefs = resolveAppliedResourceRefs(adr, context);
  const hasAttachments = adr.data.attachments && adr.data.attachments.length > 0;
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(adr, 'owners');
  const renderDecisionMakers = decisionMakers.length > 0 && shouldRenderSideBarSection(adr, 'decisionMakers');
  const renderRepository = adr.data.repository && shouldRenderSideBarSection(adr, 'repository');

  return {
    type: 'item',
    title: adr.data.name,
    badge: 'Decision record',
    summary: adr.data.summary,
    icon: 'ClipboardList',
    pages: [
      buildQuickReferenceSection(
        [
          { title: 'Overview', href: buildUrl(`/docs/adrs/${adr.data.id}/${adr.data.version}`) },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(adr, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/adrs/${adr.data.id}/${adr.data.version}/changelog`),
            },
        ].filter(Boolean) as { title: string; href: string }[]
      ),
      appliesToRefs.length > 0 &&
        shouldRenderSideBarSection(adr, 'appliesTo') && {
          type: 'group',
          title: 'Applies to',
          icon: 'GitBranch',
          pages: appliesToRefs,
        },
      shouldRenderSideBarSection(adr, 'relationships') &&
        buildAdrRelationshipSection('Supersedes', 'History', relationships.supersedes),
      shouldRenderSideBarSection(adr, 'relationships') &&
        buildAdrRelationshipSection('Superseded by', 'History', relationships.supersededBy),
      shouldRenderSideBarSection(adr, 'relationships') && buildAdrRelationshipSection('Amends', 'Pencil', relationships.amends),
      shouldRenderSideBarSection(adr, 'relationships') &&
        buildAdrRelationshipSection('Amended by', 'Pencil', relationships.amendedBy),
      shouldRenderSideBarSection(adr, 'relationships') &&
        buildAdrRelationshipSection('Related decisions', 'Link', resolveAdrPointers(adr.data.related, context.adrs)),
      renderDecisionMakers && buildDecisionMakersSection(decisionMakers),
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(adr.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(adr.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
