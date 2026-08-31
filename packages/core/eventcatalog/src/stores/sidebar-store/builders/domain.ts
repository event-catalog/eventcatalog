import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildResourceGroupSections,
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
  buildAttachmentsSection,
  buildDiagramNavItems,
  buildResourceDocsSection,
  buildArchitectureDecisionsSection,
} from './shared';
import { isVisualiserEnabled, isChangelogEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';
import { getSpecificationsForDomain, hasUbiquitousLanguageTermsWithSubdomainsInCollection } from '@utils/collections/domains';
import { customIconFieldsForResource } from '@utils/icon';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

// Sort resolved collection entries A-Z by their display name (falling back to id).
const byResourceName = (a: any, b: any) => (a.data?.name || a.data?.id || '').localeCompare(b.data?.name || b.data?.id || '');

/**
 * Predefined sidebar sections for a domain, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type DomainSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'diagrams'
  | 'api-and-contracts'
  | 'systems'
  | 'subdomains'
  | 'resources'
  | 'services'
  | 'flows'
  | 'entities'
  | 'domain-events'
  | 'external-events'
  | 'resource-groups'
  | 'agents'
  | 'external-integrations'
  | 'data-products'
  | 'decision-records'
  | 'owners'
  | 'code'
  | 'attachments';

export type DomainSections = Record<DomainSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_DOMAIN_SECTION_ORDER: DomainSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'diagrams',
  'api-and-contracts',
  'systems',
  'subdomains',
  'resources',
  'resource-groups',
  'agents',
  'external-integrations',
  'data-products',
  'owners',
  'code',
  'attachments',
];

export const buildDomainSections = (
  domain: CollectionEntry<'domains'>,
  owners: any[],
  context: ResourceGroupContext
): DomainSections => {
  const agentsInDomain = domain.data.agents || [];
  const renderAgents = agentsInDomain.length > 0 && shouldRenderSideBarSection(domain, 'agents');

  const allServicesInDomain = domain.data.services || [];
  const servicesInDomain = allServicesInDomain.filter((service) => !(service as any).data?.externalSystem).sort(byResourceName);
  const externalSystemsInDomain = allServicesInDomain.filter((service) => (service as any).data?.externalSystem);
  const renderServices = servicesInDomain.length > 0 && shouldRenderSideBarSection(domain, 'services');
  const renderExternalSystems = externalSystemsInDomain.length > 0 && shouldRenderSideBarSection(domain, 'services');

  const dataProductsInDomain = domain.data['data-products'] || [];
  const renderDataProducts = dataProductsInDomain.length > 0 && shouldRenderSideBarSection(domain, 'data-products');

  const systemsInDomain = domain.data.systems || [];
  const renderSystems = systemsInDomain.length > 0 && shouldRenderSideBarSection(domain, 'systems');

  // The domain's System Diagram only has something to show when at least one of
  // its systems takes part in a context graph (declares relationships or actors). This
  // mirrors the guard that generates the visualiser page, so we never link to a page
  // that wasn't generated.
  const hasSystemContext = systemsInDomain.some((system: any) => {
    const data = system?.data || system;
    return (data?.relationships || []).length > 0 || (data?.actors || []).length > 0;
  });

  const subDomains = domain.data.domains || [];
  const renderSubDomains = subDomains.length > 0 && shouldRenderSideBarSection(domain, 'subdomains');

  const entitiesInDomain = [...(domain.data.entities || [])].sort(byResourceName);
  const renderEntities = entitiesInDomain.length > 0 && shouldRenderSideBarSection(domain, 'entities');

  const domainFlows = [...(domain.data.flows || [])].sort(byResourceName);
  const hasFlows = domainFlows.length > 0;

  const resourceGroups = domain.data.resourceGroups || [];
  const hasResourceGroups = resourceGroups.length > 0;

  const renderUbiquitousLanguage =
    hasUbiquitousLanguageTermsWithSubdomainsInCollection(domain, context.ubiquitousLanguages || []) &&
    shouldRenderSideBarSection(domain, 'ubiquitousLanguage');
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(domain, 'owners');

  const renderVisualiser = isVisualiserEnabled();

  const hasAttachments = domain.data.attachments && domain.data.attachments.length > 0;

  const renderRepository = domain.data.repository && shouldRenderSideBarSection(domain, 'repository');
  const docsSection = buildResourceDocsSection(
    'domains',
    domain.data.id,
    domain.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  // Domain-level messages (sends/receives)
  const sendsMessages = domain.data.sends || [];
  const receivesMessages = domain.data.receives || [];
  const sortedSendsMessages = [...sendsMessages].sort(byResourceName);
  const sortedReceivesMessages = [...receivesMessages].sort(byResourceName);
  const renderMessages = shouldRenderSideBarSection(domain, 'messages');

  // The Resources page/link only makes sense when the domain has direct resources.
  // Keep this aligned with the resource groups rendered by the page.
  const hasResources =
    subDomains.length > 0 ||
    systemsInDomain.length > 0 ||
    agentsInDomain.length > 0 ||
    dataProductsInDomain.length > 0 ||
    allServicesInDomain.length > 0 ||
    domainFlows.length > 0 ||
    entitiesInDomain.length > 0 ||
    sendsMessages.length > 0 ||
    receivesMessages.length > 0;

  // The Resource Diagram renders the domain's services, agents, data products and
  // subdomains (see domains-node-graph). Only link to it when there's something to
  // draw — otherwise the visualiser page is empty.
  const hasResourceDiagram =
    servicesInDomain.length > 0 ||
    externalSystemsInDomain.length > 0 ||
    agentsInDomain.length > 0 ||
    dataProductsInDomain.length > 0 ||
    subDomains.length > 0;

  // Diagrams
  const domainDiagrams = domain.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(domainDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0;

  // Specifications
  const specifications = getSpecificationsForDomain(domain);
  const hasSpecifications = specifications.length > 0;
  const openAPISpecifications = specifications.filter((specification) => specification.type === 'openapi');
  const asyncAPISpecifications = specifications.filter((specification) => specification.type === 'asyncapi');
  const graphQLSpecifications = specifications.filter((specification) => specification.type === 'graphql');
  const renderSpecifications = hasSpecifications && shouldRenderSideBarSection(domain, 'specifications');

  // Resource subsections. These are built once and shared between the "Resources"
  // umbrella (where they render as subtle subgroups) and their standalone tokens
  // (`$services`, `$entities`, ...) for custom sidebars.
  const servicesSection: NavNode | null = renderServices
    ? {
        type: 'group',
        title: 'Services',
        icon: 'Server',
        pages: servicesInDomain.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
      }
    : null;

  const flowsSection: NavNode | null = hasFlows
    ? {
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: domainFlows.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
      }
    : null;

  const entitiesSection: NavNode | null = renderEntities
    ? {
        type: 'group',
        title: 'Entities',
        icon: 'Box',
        pages: entitiesInDomain.map((entity) => ({
          type: 'item',
          title: (entity as any).data?.name || (entity as any).data.id,
          href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
        })),
      }
    : null;

  const domainEventsSection: NavNode | null =
    renderMessages && sendsMessages.length > 0
      ? {
          type: 'group',
          title: 'Domain Events',
          icon: 'Mail',
          pages: sortedSendsMessages.map(
            (message) => `${pluralizeMessageType(message as any)}:${(message as any).data.id}:${(message as any).data.version}`
          ),
        }
      : null;

  const externalEventsSection: NavNode | null =
    renderMessages && receivesMessages.length > 0
      ? {
          type: 'group',
          title: 'External Events',
          icon: 'Mail',
          pages: sortedReceivesMessages.map(
            (receive) => `${pluralizeMessageType(receive as any)}:${(receive as any).data.id}:${(receive as any).data.version}`
          ),
        }
      : null;

  const resourceSubsections = [servicesSection, flowsSection, entitiesSection, domainEventsSection, externalEventsSection].filter(
    Boolean
  ) as NavNode[];

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        { title: 'Overview', href: buildUrl(`/docs/domains/${domain.data.id}/${domain.data.version}`) },
        hasResources && {
          title: 'Domain Resources',
          href: buildUrl(`/docs/domains/${domain.data.id}/${domain.data.version}/resources`),
        },
        renderUbiquitousLanguage && {
          title: 'Ubiquitous Language',
          href: buildUrl(`/docs/domains/${domain.data.id}/language`),
        },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(domain, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/domains/${domain.data.id}/${domain.data.version}/changelog`),
          },
      ].filter(Boolean) as { title: string; href: string }[]
    ),
    documentation: docsSection,
    architecture: {
      type: 'group',
      title: 'Architecture',
      icon: 'Workflow',
      pages: [
        {
          type: 'item',
          title: 'Overview',
          href: buildUrl(`/architecture/domains/${domain.data.id}/${domain.data.version}`),
        },
        renderSystems &&
          renderVisualiser &&
          hasSystemContext && {
            type: 'item',
            title: 'System Diagram',
            href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}/systems-context`),
          },
        renderVisualiser &&
          hasResourceDiagram && {
            type: 'item',
            title: 'Resource Diagram',
            href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}`),
          },
        renderEntities &&
          renderVisualiser && {
            type: 'item',
            title: 'Entity Diagram',
            href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}/entity-map`),
          },
      ].filter(Boolean) as ChildRef[],
    },
    diagrams: hasDiagrams
      ? {
          type: 'group',
          title: 'Diagrams',
          icon: 'FileImage',
          pages: diagramNavItems,
        }
      : null,
    'api-and-contracts': renderSpecifications
      ? {
          type: 'group',
          title: 'API & Contracts',
          icon: 'FileCode',
          pages: [
            ...openAPISpecifications.map((specification) => ({
              type: 'item',
              title: specification.name,
              leftIcon: '/icons/openapi-black.svg',
              href: buildUrl(
                `/docs/domains/${domain.data.id}/${domain.data.version}/spec/${specification.filenameWithoutExtension}`
              ),
            })),
            ...asyncAPISpecifications.map((specification) => ({
              type: 'item',
              title: specification.name,
              leftIcon: '/icons/asyncapi-black.svg',
              href: buildUrl(
                `/docs/domains/${domain.data.id}/${domain.data.version}/asyncapi/${specification.filenameWithoutExtension}`
              ),
            })),
            ...graphQLSpecifications.map((specification) => ({
              type: 'item',
              title: specification.name,
              leftIcon: '/icons/graphql-black.svg',
              href: buildUrl(
                `/docs/domains/${domain.data.id}/${domain.data.version}/graphql/${specification.filenameWithoutExtension}`
              ),
            })),
          ],
        }
      : null,
    systems: renderSystems
      ? {
          type: 'group',
          title: 'Systems',
          icon: 'Group',
          pages: systemsInDomain.map((system) => `system:${(system as any).data.id}:${(system as any).data.version}`),
        }
      : null,
    subdomains: renderSubDomains
      ? {
          type: 'group',
          title: 'Subdomains',
          icon: 'Boxes',
          pages: subDomains.map((domain) => `domain:${(domain as any).data.id}:${(domain as any).data.version}`),
        }
      : null,
    resources:
      resourceSubsections.length > 0
        ? {
            type: 'group',
            title: 'Resources',
            icon: 'Boxes',
            // Resource type subsections are ordered A-Z by their title, and the
            // resources within each subsection are ordered A-Z by name (sorted above).
            pages: resourceSubsections
              .map((section) => ({ ...section, subtle: true }))
              .sort((a, b) => a.title.localeCompare(b.title)) as ChildRef[],
          }
        : null,
    services: servicesSection,
    flows: flowsSection,
    entities: entitiesSection,
    'domain-events': domainEventsSection,
    'external-events': externalEventsSection,
    'resource-groups': hasResourceGroups
      ? (buildResourceGroupSections(resourceGroups, context).filter(Boolean) as NavNode[])
      : null,
    agents: renderAgents
      ? {
          type: 'group',
          title: 'Agents In Domain',
          icon: 'Bot',
          pages: agentsInDomain.map((agent) => `agent:${(agent as any).data.id}:${(agent as any).data.version}`),
        }
      : null,
    'external-integrations': renderExternalSystems
      ? {
          type: 'group',
          title: 'External Integrations',
          icon: 'Globe',
          pages: externalSystemsInDomain.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
        }
      : null,
    'data-products': renderDataProducts
      ? {
          type: 'group',
          title: 'Data Products',
          icon: 'Package',
          pages: dataProductsInDomain.map(
            (dataProduct) => `data-product:${(dataProduct as any).data.id}:${(dataProduct as any).data.version}`
          ),
        }
      : null,
    'decision-records': shouldRenderSideBarSection(domain, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(domain, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    code: renderRepository ? buildRepositorySection(domain.data.repository as { url: string; language: string }) : null,
    attachments: hasAttachments ? buildAttachmentsSection(domain.data.attachments as any[]) : null,
  };
};

export type BuildDomainNodeOptions = {
  /** A parsed `sidebar.json` for this domain. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildDomainNode = (
  domain: CollectionEntry<'domains'>,
  owners: any[],
  context: ResourceGroupContext,
  options: BuildDomainNodeOptions = {}
): NavNode => {
  const sections = buildDomainSections(domain, owners, context);

  const pages = resolveSidebarPages(sections, DEFAULT_DOMAIN_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'domains', id: domain.data.id, version: domain.data.version, entry: domain },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: domain.data.name,
    badge: 'Domain',
    summary: domain.data.summary,
    // Domains use a custom icon when defined, otherwise none — the surrounding
    // 'Domains' section header (and Domain badge) already convey the type, so the
    // default Boxes glyph on every item is redundant.
    ...customIconFieldsForResource(domain.data),
    pages,
  };
};
