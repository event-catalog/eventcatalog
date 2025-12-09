import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef } from './shared';
import { buildQuickReferenceSection, buildOwnersSection, shouldRenderSideBarSection, buildRepositorySection } from './shared';
import { isVisualiserEnabled } from '@utils/feature';

export const buildContainerNode = (container: CollectionEntry<'containers'>, owners: any[]): NavNode => {
  const servicesWritingToContainer = container.data.servicesThatWriteToContainer || [];
  const servicesReadingFromContainer = container.data.servicesThatReadFromContainer || [];

  const renderServicesWritingToContainer =
    servicesWritingToContainer.length > 0 && shouldRenderSideBarSection(container, 'services');
  const renderServicesReadingFromContainer =
    servicesReadingFromContainer.length > 0 && shouldRenderSideBarSection(container, 'services');

  const renderVisualiser = isVisualiserEnabled();

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(container, 'owners');

  const renderRepository = container.data.repository && shouldRenderSideBarSection(container, 'repository');

  return {
    type: 'item',
    title: container.data.name,
    badge: 'Container',
    summary: container.data.summary,
    pages: [
      buildQuickReferenceSection([
        {
          title: 'Overview',
          href: buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`),
        },
      ]),
      renderVisualiser && {
        type: 'group',
        title: 'Architecture & Design',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Interaction Map',
            href: buildUrl(`/visualiser/containers/${container.data.id}/${container.data.version}`),
          },
        ],
      },
      renderServicesWritingToContainer && {
        type: 'group',
        title: 'Services (Writes)',
        icon: 'Server',
        pages: servicesWritingToContainer.map(
          (service) => `service:${(service as any).data.id}:${(service as any).data.version}`
        ),
      },
      renderServicesReadingFromContainer && {
        type: 'group',
        title: 'Services (Reads)',
        icon: 'Server',
        pages: servicesReadingFromContainer.map(
          (service) => `service:${(service as any).data.id}:${(service as any).data.version}`
        ),
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(container.data.repository as { url: string; language: string }),
    ].filter(Boolean) as ChildRef[],
  };
};
