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
import type { NavNode, ResourceGroupContext } from './shared';
import {
  buildAttachmentsSection,
  buildOwnersSection,
  buildQuickReferenceSection,
  buildRepositorySection,
  shouldRenderSideBarSection,
} from './shared';
import { isChangelogEnabled } from '@utils/feature';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

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

/**
 * Predefined sidebar sections for a decision record, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type AdrSectionKey =
  | 'quick-reference'
  | 'applies-to'
  | 'supersedes'
  | 'superseded-by'
  | 'amends'
  | 'amended-by'
  | 'related-decisions'
  | 'decision-makers'
  | 'owners'
  | 'code'
  | 'attachments';

export type AdrSections = Record<AdrSectionKey, NavNode | NavNode[] | null>;

/** Order of sections in the default (generated) sidebar. */
export const DEFAULT_ADR_SECTION_ORDER: AdrSectionKey[] = [
  'quick-reference',
  'applies-to',
  'supersedes',
  'superseded-by',
  'amends',
  'amended-by',
  'related-decisions',
  'decision-makers',
  'owners',
  'code',
  'attachments',
];

export const buildAdrSections = (adr: Adr, owners: any[], decisionMakers: any[], context: ResourceGroupContext): AdrSections => {
  const relationships = getAdrRelationships(adr, context.adrs);
  const appliesToRefs = resolveAppliedResourceRefs(adr, context);
  const hasAttachments = adr.data.attachments && adr.data.attachments.length > 0;
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(adr, 'owners');
  const renderDecisionMakers = decisionMakers.length > 0 && shouldRenderSideBarSection(adr, 'decisionMakers');
  const renderRepository = adr.data.repository && shouldRenderSideBarSection(adr, 'repository');
  const renderRelationships = shouldRenderSideBarSection(adr, 'relationships');

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        { title: 'Overview', href: buildUrl(`/docs/adrs/${adr.data.id}/${adr.data.version}`) },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(adr, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/adrs/${adr.data.id}/${adr.data.version}/changelog`),
          },
      ].filter(Boolean) as { title: string; href: string }[]
    ),
    'applies-to':
      appliesToRefs.length > 0 && shouldRenderSideBarSection(adr, 'appliesTo')
        ? {
            type: 'group',
            title: 'Applies to',
            icon: 'GitBranch',
            pages: appliesToRefs,
          }
        : null,
    supersedes: renderRelationships ? buildAdrRelationshipSection('Supersedes', 'History', relationships.supersedes) : null,
    'superseded-by': renderRelationships
      ? buildAdrRelationshipSection('Superseded by', 'History', relationships.supersededBy)
      : null,
    amends: renderRelationships ? buildAdrRelationshipSection('Amends', 'Pencil', relationships.amends) : null,
    'amended-by': renderRelationships ? buildAdrRelationshipSection('Amended by', 'Pencil', relationships.amendedBy) : null,
    'related-decisions': renderRelationships
      ? buildAdrRelationshipSection('Related decisions', 'Link', resolveAdrPointers(adr.data.related, context.adrs))
      : null,
    'decision-makers': renderDecisionMakers ? buildDecisionMakersSection(decisionMakers) : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    code: renderRepository ? buildRepositorySection(adr.data.repository as { url: string; language: string }) : null,
    attachments: hasAttachments ? buildAttachmentsSection(adr.data.attachments as any[]) : null,
  };
};

export type BuildAdrNodeOptions = {
  /** A parsed `sidebar.json` for this decision record. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildAdrNode = (
  adr: Adr,
  owners: any[],
  decisionMakers: any[],
  context: ResourceGroupContext,
  options: BuildAdrNodeOptions = {}
): NavNode => {
  const sections = buildAdrSections(adr, owners, decisionMakers, context);

  const pages = resolveSidebarPages(sections, DEFAULT_ADR_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'adrs', id: adr.data.id, version: adr.data.version, entry: adr },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: adr.data.name,
    badge: 'Decision record',
    summary: adr.data.summary,
    icon: 'ClipboardList',
    pages,
  };
};
