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
} from './shared';
import { isVisualiserEnabled, isChangelogEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';
import { getSpecificationsForDomain, hasUbiquitousLanguageTermsWithSubdomainsInCollection } from '@utils/collections/domains';
import { customIconFieldsForResource } from '@utils/icon';

// Sort resolved collection entries A-Z by their display name (falling back to id).
const byResourceName = (a: any, b: any) => (a.data?.name || a.data?.id || '').localeCompare(b.data?.name || b.data?.id || '');

export const buildDomainNode = (domain: CollectionEntry<'domains'>, owners: any[], context: ResourceGroupContext): NavNode => {
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

  // The Resources page/link only makes sense when the domain actually has resources
  // attached (services, flows, entities or its own messages). Mirrors what the page renders.
  const hasResources =
    servicesInDomain.length > 0 ||
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

  return {
    type: 'item',
    title: domain.data.name,
    badge: 'Domain',
    summary: domain.data.summary,
    // Domains use a custom icon when defined, otherwise none — the surrounding
    // 'Domains' section header (and Domain badge) already convey the type, so the
    // default Boxes glyph on every item is redundant.
    ...customIconFieldsForResource(domain.data),
    pages: [
      buildQuickReferenceSection(
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
      docsSection,
      {
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
      hasDiagrams && {
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
        pages: diagramNavItems,
      },
      renderSpecifications && {
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
      },
      renderSystems && {
        type: 'group',
        title: 'Systems',
        icon: 'Group',
        pages: systemsInDomain.map((system) => `system:${(system as any).data.id}:${(system as any).data.version}`),
      },
      renderSubDomains && {
        type: 'group',
        title: 'Subdomains',
        icon: 'Boxes',
        pages: subDomains.map((domain) => `domain:${(domain as any).data.id}:${(domain as any).data.version}`),
      },
      (renderServices ||
        hasFlows ||
        renderEntities ||
        (renderMessages && (sendsMessages.length > 0 || receivesMessages.length > 0))) && {
        type: 'group',
        title: 'Resources',
        icon: 'Boxes',
        // Resource type subsections are ordered A-Z by their title, and the
        // resources within each subsection are ordered A-Z by name (sorted above).
        pages: (
          [
            renderServices && {
              type: 'group',
              title: 'Services',
              subtle: true,
              icon: 'Server',
              pages: servicesInDomain.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
            },
            hasFlows && {
              type: 'group',
              title: 'Flows',
              subtle: true,
              icon: 'Waypoints',
              pages: domainFlows.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
            },
            renderEntities && {
              type: 'group',
              title: 'Entities',
              subtle: true,
              icon: 'Box',
              pages: entitiesInDomain.map((entity) => ({
                type: 'item',
                title: (entity as any).data?.name || (entity as any).data.id,
                href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
              })),
            },
            renderMessages &&
              sendsMessages.length > 0 && {
                type: 'group',
                title: 'Domain Events',
                subtle: true,
                icon: 'Mail',
                pages: sortedSendsMessages.map(
                  (message) =>
                    `${pluralizeMessageType(message as any)}:${(message as any).data.id}:${(message as any).data.version}`
                ),
              },
            renderMessages &&
              receivesMessages.length > 0 && {
                type: 'group',
                title: 'External Events',
                subtle: true,
                icon: 'Mail',
                pages: sortedReceivesMessages.map(
                  (receive) =>
                    `${pluralizeMessageType(receive as any)}:${(receive as any).data.id}:${(receive as any).data.version}`
                ),
              },
          ].filter(Boolean) as NavNode[]
        ).sort((a, b) => a.title.localeCompare(b.title)) as ChildRef[],
      },

      ...(hasResourceGroups ? buildResourceGroupSections(resourceGroups, context) : []),
      renderAgents && {
        type: 'group',
        title: 'Agents In Domain',
        icon: 'Bot',
        pages: agentsInDomain.map((agent) => `agent:${(agent as any).data.id}:${(agent as any).data.version}`),
      },
      renderExternalSystems && {
        type: 'group',
        title: 'External Integrations',
        icon: 'Globe',
        pages: externalSystemsInDomain.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
      },
      renderDataProducts && {
        type: 'group',
        title: 'Data Products',
        icon: 'Package',
        pages: dataProductsInDomain.map(
          (dataProduct) => `data-product:${(dataProduct as any).data.id}:${(dataProduct as any).data.version}`
        ),
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(domain.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(domain.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
