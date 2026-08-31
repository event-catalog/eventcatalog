import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ResourceGroupContext } from './shared';
import {
  buildArchitectureDecisionsSection,
  buildAttachmentsSection,
  buildOwnersSection,
  buildQuickReferenceSection,
  buildResourceDocsSection,
  shouldRenderSideBarSection,
} from './shared';
import { isChangelogEnabled, isVisualiserEnabled } from '@utils/feature';
import { iconFieldsForResource } from '@utils/icon';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

/**
 * Predefined sidebar sections for an entity, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type EntitySectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'domains'
  | 'services'
  | 'decision-records'
  | 'owners'
  | 'attachments';

export type EntitySections = Record<EntitySectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_ENTITY_SECTION_ORDER: EntitySectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'domains',
  'services',
  'owners',
  'attachments',
];

export const buildEntitySections = (
  entity: CollectionEntry<'entities'>,
  owners: any[],
  context: ResourceGroupContext
): EntitySections => {
  const domains = entity.data.domains || [];
  const services = entity.data.services || [];

  const entityMapTargets = [
    domains.length === 1 && {
      label: 'Domain',
      href: buildUrl(`/visualiser/domains/${(domains[0] as any).data.id}/${(domains[0] as any).data.version}/entity-map`),
    },
    services.length === 1 && {
      label: 'Service',
      href: buildUrl(`/visualiser/services/${(services[0] as any).data.id}/${(services[0] as any).data.version}/entity-map`),
    },
  ].filter(Boolean) as { label: string; href: string }[];

  const renderArchitecture = isVisualiserEnabled() && entityMapTargets.length > 0;
  const renderDomains = domains.length > 0 && shouldRenderSideBarSection(entity, 'domains');
  const renderServices = services.length > 0 && shouldRenderSideBarSection(entity, 'services');
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(entity, 'owners');
  const hasAttachments = entity.data.attachments && entity.data.attachments.length > 0;

  const docsSection = buildResourceDocsSection(
    'entities',
    entity.data.id,
    entity.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        { title: 'Overview', href: buildUrl(`/docs/entities/${entity.data.id}/${entity.data.version}`) },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(entity, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/entities/${entity.data.id}/${entity.data.version}/changelog`),
          },
      ].filter(Boolean) as { title: string; href: string }[]
    ),
    documentation: docsSection,
    architecture: renderArchitecture
      ? {
          type: 'group',
          title: 'Architecture',
          icon: 'Workflow',
          pages: entityMapTargets.map((target) => ({
            type: 'item',
            title: entityMapTargets.length === 1 ? 'Entity Map' : `${target.label} Entity Map`,
            href: target.href,
          })),
        }
      : null,
    domains: renderDomains
      ? {
          type: 'group',
          title: 'Domains',
          icon: 'Boxes',
          pages: domains.map((domain: any) => `domain:${domain.data.id}:${domain.data.version}`),
        }
      : null,
    services: renderServices
      ? {
          type: 'group',
          title: 'Services',
          icon: 'Server',
          pages: services.map((service: any) => `service:${service.data.id}:${service.data.version}`),
        }
      : null,
    'decision-records': shouldRenderSideBarSection(entity, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(entity, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    attachments: hasAttachments ? buildAttachmentsSection(entity.data.attachments as any[]) : null,
  };
};

export type BuildEntityNodeOptions = {
  /** A parsed `sidebar.json` for this entity. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildEntityNode = (
  entity: CollectionEntry<'entities'>,
  owners: any[],
  context: ResourceGroupContext,
  options: BuildEntityNodeOptions = {}
): NavNode => {
  const sections = buildEntitySections(entity, owners, context);

  const pages = resolveSidebarPages(sections, DEFAULT_ENTITY_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'entities', id: entity.data.id, version: entity.data.version, entry: entity },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: entity.data.name,
    badge: 'Entity',
    summary: entity.data.summary,
    ...iconFieldsForResource(entity.data, 'Box'),
    pages,
  };
};
