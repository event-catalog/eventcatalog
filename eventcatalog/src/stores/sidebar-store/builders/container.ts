import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
  buildAttachmentsSection,
  buildDiagramNavItems,
} from './shared';
import { isVisualiserEnabled } from '@utils/feature';

export const buildContainerNode = (
  container: CollectionEntry<'containers'>,
  owners: any[],
  context: ResourceGroupContext
): NavNode => {
  const servicesWritingToContainer = container.data.servicesThatWriteToContainer || [];
  const servicesReadingFromContainer = container.data.servicesThatReadFromContainer || [];

  const renderServicesWritingToContainer =
    servicesWritingToContainer.length > 0 && shouldRenderSideBarSection(container, 'services');
  const renderServicesReadingFromContainer =
    servicesReadingFromContainer.length > 0 && shouldRenderSideBarSection(container, 'services');

  const renderVisualiser = isVisualiserEnabled();

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(container, 'owners');

  const hasAttachments = container.data.attachments && container.data.attachments.length > 0;

  const renderRepository = container.data.repository && shouldRenderSideBarSection(container, 'repository');

  // Diagrams
  const containerDiagrams = container.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(containerDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0;

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
        title: 'Architecture',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Map',
            href: buildUrl(`/visualiser/containers/${container.data.id}/${container.data.version}`),
          },
        ],
      },
      hasDiagrams && {
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
        pages: diagramNavItems,
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
      hasAttachments && buildAttachmentsSection(container.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
