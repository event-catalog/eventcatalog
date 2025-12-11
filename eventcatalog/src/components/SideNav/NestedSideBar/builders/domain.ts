import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildResourceGroupSections,
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
} from './shared';
import { isVisualiserEnabled } from '@utils/feature';

export const buildDomainNode = (domain: CollectionEntry<'domains'>, owners: any[], context: ResourceGroupContext): NavNode => {
  const servicesInDomain = domain.data.services || [];
  const renderServices = servicesInDomain.length > 0 && shouldRenderSideBarSection(domain, 'services');

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

  const renderRepository = domain.data.repository && shouldRenderSideBarSection(domain, 'repository');
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
        title: 'Architecture & Design',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Architecture Diagram',
            href: buildUrl(`/architecture/domains/${domain.data.id}/${domain.data.version}`),
          },
          renderEntities &&
            renderVisualiser && {
              type: 'item',
              title: 'Entity Map',
              href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}/entity-map`),
            },
          renderVisualiser && {
            type: 'item',
            title: 'Interaction Map',
            href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}`),
          },
        ].filter(Boolean) as ChildRef[],
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
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(domain.data.repository as { url: string; language: string }),
    ].filter(Boolean) as ChildRef[],
  };
};
