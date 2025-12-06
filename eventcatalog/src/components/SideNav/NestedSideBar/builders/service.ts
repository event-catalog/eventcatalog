import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import { getSpecificationsForService } from '@utils/collections/services';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import { uniqueBy, buildQuickReferenceSection, buildOwnersSection, shouldRenderSideBarSection, buildResourceGroupSections, buildRepositorySection } from './shared';
import { isVisualiserEnabled } from '@utils/feature';

export const buildServiceNode = (
  service: CollectionEntry<'services'>,
  owners: any[],
  context: any
): NavNode => {
  const sendsMessages = service.data.sends || [];
  const receivesMessages = service.data.receives || [];
  const serviceEntities = service.data.entities || [];

  const specifications = getSpecificationsForService(service);
  const hasSpecifications = specifications.length > 0;
  const openAPISpecifications = specifications.filter((specification) => specification.type === 'openapi');
  const asyncAPISpecifications = specifications.filter((specification) => specification.type === 'asyncapi');
  const graphQLSpecifications = specifications.filter((specification) => specification.type === 'graphql');

  const dataStoresInService = uniqueBy([...(service.data.writesTo || []), ...(service.data.readsFrom || [])], 'id');

  const hasDataStores = dataStoresInService.length > 0;
  const resourceGroups = service.data.resourceGroups || [];
  const hasResourceGroups = resourceGroups.length > 0;
  
  const renderResourceGroups = hasResourceGroups && shouldRenderSideBarSection(service, 'resourceGroups');
  const renderVisualiser = isVisualiserEnabled();
  const renderMessages = shouldRenderSideBarSection(service, 'messages');
  const renderSpecifications = hasSpecifications && shouldRenderSideBarSection(service, 'specifications');
  const renderEntities = serviceEntities.length > 0 && shouldRenderSideBarSection(service, 'entities');
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(service, 'owners');
  const renderRepository = service.data.repository && shouldRenderSideBarSection(service, 'repository');

  return {
    type: 'item',
    title: service.data.name,
    badge: 'Service',
    children: [
      buildQuickReferenceSection([
        { title: 'Overview', href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}`) },
      ]),
      {
        type: 'section',
        title: 'Architecture & Design',
        icon: 'Workflow',
        children: [
          {
            type: 'item',
            title: 'Architecture Diagram',
            href: buildUrl(`/architecture/services/${service.data.id}/${service.data.version}`),
          },
          renderVisualiser && {
            type: 'item',
            title: 'Interaction Map',
            href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`),
          },
          renderVisualiser && hasDataStores && {
            type: 'item',
            title: 'Data Map',
            href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}/data`),
          },
        ],
      },
      renderSpecifications && {
        type: 'section',
        title: 'API & Contracts',
        icon: 'FileCode',
        children: [
          ...openAPISpecifications.map((specification) => ({
            type: 'item',
            title: `${specification.name} (OpenAPI)`,
            href: buildUrl(
              `/docs/services/${service.data.id}/${service.data.version}/spec/${specification.filenameWithoutExtension}`
            ),
          })),
          ...asyncAPISpecifications.map((specification) => ({
            type: 'item',
            title: `${specification.name} (AsyncAPI)`,
            href: buildUrl(
              `/docs/services/${service.data.id}/${service.data.version}/asyncapi/${specification.filenameWithoutExtension}`
            ),
          })),
          ...graphQLSpecifications.map((specification) => ({
            type: 'item',
            title: `${specification.name} (GraphQL)`,
            href: buildUrl(
              `/docs/services/${service.data.id}/${service.data.version}/graphql/${specification.filenameWithoutExtension}`
            ),
          })),
        ],
      },
      renderResourceGroups && buildResourceGroupSections(resourceGroups, context),
      hasDataStores && {
        type: 'section',
        title: 'State and Persistence',
        icon: 'Database',
        children: dataStoresInService.map(
          (dataStore) => `item:container:${(dataStore as any).data.id}:${(dataStore as any).data.version}`
        ),
      },
      renderEntities && {
        type: 'section',
        title: 'Entities',
        icon: 'Box',
        children: serviceEntities.map((entity) => `item:entity:${(entity as any).data.id}:${(entity as any).data.version}`),
      },
      sendsMessages.length > 0 && renderMessages && {
        type: 'section',
        title: 'Outbound Messages',
        icon: 'Mail',
        children: sendsMessages.map((message) => `item:message:${(message as any).data.id}:${(message as any).data.version}`),
      },
      receivesMessages.length > 0 && renderMessages && {
        type: 'section',
        title: 'Inbound Messages',
        icon: 'Mail',
        children: receivesMessages.map(
          (receive) => `item:message:${(receive as any).data.id}:${(receive as any).data.version}`
        ),
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(service.data.repository as { url: string; language: string }),
    ].filter(Boolean) as ChildRef[],
  };
};

