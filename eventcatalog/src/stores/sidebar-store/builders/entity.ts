import type { Entity } from '@utils/collections/entities';
import { buildUrl } from '@utils/url-builder';
import { isVisualiserEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
  buildAttachmentsSection,
  buildDiagramNavItems,
} from './shared';

export const buildEntityNode = (entity: Entity, owners: any[], context: ResourceGroupContext): NavNode => {
  const sendsMessages = entity.data.sends || [];
  const receivesMessages = entity.data.receives || [];

  const hasAttachments = (entity.data.attachments?.length ?? 0) > 0;
  const entityDiagrams = entity.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(entityDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0;

  const renderVisualiser = isVisualiserEnabled();
  const renderMessages = shouldRenderSideBarSection(entity, 'messages');
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(entity, 'owners');
  const renderRepository = entity.data.repository && shouldRenderSideBarSection(entity, 'repository');

  return {
    type: 'item',
    title: entity.data.name || entity.data.id,
    badge: entity.data.aggregateRoot ? 'Aggregate' : 'Entity',
    summary: entity.data.summary,
    pages: [
      buildQuickReferenceSection([
        { title: 'Overview', href: buildUrl(`/docs/entities/${entity.data.id}/${entity.data.version}`) },
      ]),
      // Architecture section (always available, like services)
      {
        type: 'group',
        title: 'Architecture',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Overview',
            href: buildUrl(`/architecture/entities/${entity.data.id}/${entity.data.version}`),
          },
          renderVisualiser && {
            type: 'item',
            title: 'Map',
            href: buildUrl(`/visualiser/entities/${entity.data.id}/${entity.data.version}`),
          },
        ].filter(Boolean) as ChildRef[],
      },
      // Diagrams
      hasDiagrams && {
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
        pages: diagramNavItems,
      },
      // Outbound Messages (sends)
      sendsMessages.length > 0 &&
        renderMessages && {
          type: 'group',
          title: 'Outbound Messages',
          icon: 'Mail',
          pages: sendsMessages.map((message) => `${pluralizeMessageType(message)}:${message.data.id}:${message.data.version}`),
        },
      // Inbound Messages (receives)
      receivesMessages.length > 0 &&
        renderMessages && {
          type: 'group',
          title: 'Inbound Messages',
          icon: 'Mail',
          pages: receivesMessages.map((message) => `${pluralizeMessageType(message)}:${message.data.id}:${message.data.version}`),
        },
      // Owners
      renderOwners && buildOwnersSection(owners),
      // Repository
      renderRepository && buildRepositorySection(entity.data.repository as { url: string; language: string }),
      // Attachments
      hasAttachments && buildAttachmentsSection(entity.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
