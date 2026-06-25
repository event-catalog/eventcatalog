import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
  buildAttachmentsSection,
  buildResourceDocsSection,
} from './shared';
import { isChangelogEnabled, isVisualiserEnabled } from '@utils/feature';
import { iconFieldsForResource } from '@utils/icon';

export const buildSystemNode = (system: CollectionEntry<'systems'>, owners: any[], context: ResourceGroupContext): NavNode => {
  const servicesInSystem = system.data.services || [];
  const renderServices = servicesInSystem.length > 0 && shouldRenderSideBarSection(system, 'services');

  const flowsInSystem = system.data.flows || [];
  const renderFlows = flowsInSystem.length > 0 && shouldRenderSideBarSection(system, 'flows');

  const entitiesInSystem = system.data.entities || [];
  const renderEntities = entitiesInSystem.length > 0 && shouldRenderSideBarSection(system, 'entities');

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(system, 'owners');
  const renderRepository = system.data.repository && shouldRenderSideBarSection(system, 'repository');
  const hasAttachments = system.data.attachments && system.data.attachments.length > 0;

  const renderVisualiser = isVisualiserEnabled();

  const docsSection = buildResourceDocsSection(
    'systems',
    system.data.id,
    system.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  return {
    type: 'item',
    title: system.data.name,
    badge: 'System',
    summary: system.data.summary,
    ...iconFieldsForResource(system.data, 'Group'),
    pages: [
      buildQuickReferenceSection(
        [
          {
            title: 'Overview',
            href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}`),
          },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(system, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}/changelog`),
            },
        ].filter(Boolean) as { title: string; href: string }[]
      ),
      docsSection,
      renderVisualiser && {
        type: 'group',
        title: 'Architecture',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Map',
            href: buildUrl(`/visualiser/systems/${system.data.id}/${system.data.version}`),
          },
        ] as ChildRef[],
      },
      renderServices && {
        type: 'group',
        title: 'Services In System',
        icon: 'Server',
        pages: servicesInSystem.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
      },
      renderFlows && {
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: flowsInSystem.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
      },
      renderEntities && {
        type: 'group',
        title: 'Entities',
        icon: 'Box',
        pages: entitiesInSystem.map((entity) => ({
          type: 'item',
          title: (entity as any).data?.name || (entity as any).data.id,
          href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
        })),
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(system.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(system.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
