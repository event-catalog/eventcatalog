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
} from './shared';
import { isVisualiserEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';
import { getSpecificationsForDomain } from '@utils/collections/domains';

export const buildDomainNode = (domain: CollectionEntry<'domains'>, owners: any[], context: ResourceGroupContext): NavNode => {
  const servicesInDomain = domain.data.services || [];
  const renderServices = servicesInDomain.length > 0 && shouldRenderSideBarSection(domain, 'services');

  const dataProductsInDomain = domain.data['data-products'] || [];
  const renderDataProducts = dataProductsInDomain.length > 0 && shouldRenderSideBarSection(domain, 'data-products');

  const subDomains = domain.data.domains || [];
  const renderSubDomains = subDomains.length > 0 && shouldRenderSideBarSection(domain, 'subdomains');

  const entitiesInDomain = domain.data.entities || [];
  const renderEntities = entitiesInDomain.length > 0 && shouldRenderSideBarSection(domain, 'entities');

  const domainFlows = domain.data.flows || [];
  const hasFlows = domainFlows.length > 0;

  const resourceGroups = domain.data.resourceGroups || [];
  const hasResourceGroups = resourceGroups.length > 0;

  const renderUbiquitousLanguage = shouldRenderSideBarSection(domain, 'ubiquitousLanguage');
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(domain, 'owners');

  const renderVisualiser = isVisualiserEnabled();

  const hasAttachments = domain.data.attachments && domain.data.attachments.length > 0;

  const renderRepository = domain.data.repository && shouldRenderSideBarSection(domain, 'repository');

  // Domain-level messages (sends/receives)
  const sendsMessages = domain.data.sends || [];
  const receivesMessages = domain.data.receives || [];
  const renderMessages = shouldRenderSideBarSection(domain, 'messages');

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
    pages: [
      buildQuickReferenceSection([
        { title: 'Overview', href: buildUrl(`/docs/domains/${domain.data.id}/${domain.data.version}`) },
        renderUbiquitousLanguage && { title: 'Ubiquitous Language', href: buildUrl(`/docs/domains/${domain.data.id}/language`) },
      ]),
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
          renderVisualiser && {
            type: 'item',
            title: 'Map',
            href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}`),
          },
          renderEntities &&
            renderVisualiser && {
              type: 'item',
              title: 'Entity Map',
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
      renderSubDomains && {
        type: 'group',
        title: 'Subdomains',
        icon: 'Boxes',
        pages: subDomains.map((domain) => `domain:${(domain as any).data.id}:${(domain as any).data.version}`),
      },
      hasFlows && {
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: domainFlows.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
      },
      renderEntities && {
        type: 'group',
        title: 'Entities',
        icon: 'Box',
        pages: entitiesInDomain.map((entity) => ({
          type: 'item',
          title: (entity as any).data?.name || (entity as any).data.id,
          href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
        })),
      },

      ...(hasResourceGroups ? buildResourceGroupSections(resourceGroups, context) : []),
      renderServices && {
        type: 'group',
        title: 'Services In Domain',
        icon: 'Server',
        pages: servicesInDomain.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
      },
      renderDataProducts && {
        type: 'group',
        title: 'Data Products',
        icon: 'Package',
        pages: dataProductsInDomain.map(
          (dataProduct) => `data-product:${(dataProduct as any).data.id}:${(dataProduct as any).data.version}`
        ),
      },
      sendsMessages.length > 0 &&
        renderMessages && {
          type: 'group',
          title: 'Domain Events',
          icon: 'Mail',
          pages: sendsMessages.map(
            (message) => `${pluralizeMessageType(message as any)}:${(message as any).data.id}:${(message as any).data.version}`
          ),
        },
      receivesMessages.length > 0 &&
        renderMessages && {
          type: 'group',
          title: 'External Events',
          icon: 'Mail',
          pages: receivesMessages.map(
            (receive) => `${pluralizeMessageType(receive as any)}:${(receive as any).data.id}:${(receive as any).data.version}`
          ),
        },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(domain.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(domain.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
