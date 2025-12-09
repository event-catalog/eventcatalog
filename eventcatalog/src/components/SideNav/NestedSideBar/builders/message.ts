import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import { getSchemaFormatFromURL } from '@utils/collections/schemas';
import type { NavNode, ChildRef } from './shared';
import { buildQuickReferenceSection, buildOwnersSection, shouldRenderSideBarSection, buildRepositorySection } from './shared';
import { isVisualiserEnabled } from '@utils/feature';

export const buildMessageNode = (message: CollectionEntry<'events' | 'commands' | 'queries'>, owners: any[]): NavNode => {
  const producers = message.data.producers || [];
  const consumers = message.data.consumers || [];
  const collection = message.collection;

  const renderProducers = producers.length > 0 && shouldRenderSideBarSection(message, 'producers');
  const renderConsumers = consumers.length > 0 && shouldRenderSideBarSection(message, 'consumers');
  const renderRepository = message.data.repository && shouldRenderSideBarSection(message, 'repository');

  // Determine badge based on collection type
  const badgeMap: Record<string, string> = {
    events: 'Event',
    commands: 'Command',
    queries: 'Query',
  };
  const badge = badgeMap[collection] || 'Message';

  const hasSchema = message.data.schemaPath !== undefined;
  const renderVisualiser = isVisualiserEnabled();

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(message, 'owners');

  return {
    type: 'item',
    title: message.data.name,
    badge,
    summary: message.data.summary,
    pages: [
      buildQuickReferenceSection([
        {
          title: 'Overview',
          href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}`),
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
            href: buildUrl(`/visualiser/${collection}/${message.data.id}/${message.data.version}`),
          },
        ],
      },
      hasSchema && {
        type: 'group',
        title: `API & Contracts`,
        icon: 'FileJson',
        pages: [
          {
            type: 'item',
            title: `Schema (${getSchemaFormatFromURL(message.data.schemaPath!).toUpperCase()})`,
            href: buildUrl(`/schemas/${collection}/${message.data.id}/${message.data.version}`),
          },
        ],
      },
      renderProducers && {
        type: 'group',
        title: 'Producers',
        icon: 'Server',
        pages: producers.map((producer) => `service:${(producer as any).data.id}:${(producer as any).data.version}`),
        visible: producers.length > 0,
      },
      renderConsumers && {
        type: 'group',
        title: 'Consumers',
        icon: 'Server',
        pages: consumers.map((consumer) => `service:${(consumer as any).data.id}:${(consumer as any).data.version}`),
        visible: consumers.length > 0,
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(message.data.repository as { url: string; language: string }),
    ].filter(Boolean) as ChildRef[],
  };
};
