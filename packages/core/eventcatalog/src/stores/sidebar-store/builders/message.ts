import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import { getSchemaFormatFromURL } from '@utils/collections/schemas';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
  buildAttachmentsSection,
  buildDiagramNavItems,
  buildResourceDocsSection,
} from './shared';
import { isVisualiserEnabled, isChangelogEnabled } from '@utils/feature';
import { iconFieldsForResource } from '@utils/icon';
import { collectionToResourceMap } from '@utils/collections/util';
import type { MessageTrigger } from '@utils/collections/message-triggers';

type MessageSchemaEntry = CollectionEntry<'schemas'>;

const getProducerConsumerPageRef = (resource: any) => {
  const resourceType = collectionToResourceMap[resource.collection as keyof typeof collectionToResourceMap];
  return `${resourceType}:${resource.data.id}:${resource.data.version}`;
};

const getSchemasForMessage = (
  message: CollectionEntry<'events' | 'commands' | 'queries'>,
  schemas: MessageSchemaEntry[] = []
) => {
  return schemas.filter(
    (schema) =>
      schema.data.message.collection === message.collection &&
      schema.data.message.id === message.data.id &&
      schema.data.message.version === message.data.version
  );
};

const getSchemaNavTitle = (schemas: MessageSchemaEntry[]) => {
  if (schemas.length > 1) return 'Schemas';

  const schemaPath = schemas[0]?.data.file || schemas[0]?.data.source.path || schemas[0]?.data.ref || schemas[0]?.id;
  const format = schemaPath ? getSchemaFormatFromURL(schemaPath) : schemas[0]?.data.format;
  return format ? `Schema (${format.toUpperCase()})` : 'Schema';
};

export const buildMessageNode = (
  message: CollectionEntry<'events' | 'commands' | 'queries'>,
  owners: any[],
  context: ResourceGroupContext,
  hasFieldUsage: boolean = false,
  flowRefs: string[] = [],
  messageTriggers: { triggers: MessageTrigger[]; triggeredBy: MessageTrigger[] } = { triggers: [], triggeredBy: [] }
): NavNode => {
  const producers = message.data.producers || [];
  const consumers = message.data.consumers || [];
  const collection = message.collection;
  const triggerRefs = [...new Set(messageTriggers.triggers.map(({ message }) => getProducerConsumerPageRef(message)))];
  const triggeredByRefs = [...new Set(messageTriggers.triggeredBy.map(({ message }) => getProducerConsumerPageRef(message)))];

  const renderProducers = producers.length > 0 && shouldRenderSideBarSection(message, 'producers');
  const renderConsumers = consumers.length > 0 && shouldRenderSideBarSection(message, 'consumers');
  const renderTriggers = triggerRefs.length > 0 && shouldRenderSideBarSection(message, 'triggers');
  const renderTriggeredBy = triggeredByRefs.length > 0 && shouldRenderSideBarSection(message, 'triggeredBy');
  const renderFlows = flowRefs.length > 0 && shouldRenderSideBarSection(message, 'flows');
  const renderRepository = message.data.repository && shouldRenderSideBarSection(message, 'repository');
  const hasTriggerPaths = messageTriggers.triggers.length > 0 || messageTriggers.triggeredBy.length > 0;

  // Determine badge based on collection type
  const badgeMap: Record<string, string> = {
    events: 'Event',
    commands: 'Command',
    queries: 'Query',
  };
  const badge = badgeMap[collection] || 'Message';

  const iconMap: Record<string, string> = {
    events: 'Zap',
    commands: 'MessageSquare',
    queries: 'Search',
  };
  const defaultIcon = iconMap[collection] || 'Mail';

  const resolvedSchemas = getSchemasForMessage(message, context.schemas);
  const hasSchema = resolvedSchemas.length > 0;
  const renderVisualiser = isVisualiserEnabled();
  const docsSection = buildResourceDocsSection(
    collection as 'events' | 'commands' | 'queries',
    message.data.id,
    message.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  const hasAttachments = message.data.attachments && message.data.attachments.length > 0;

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(message, 'owners');

  // Diagrams
  const messageDiagrams = message.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(messageDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0;

  return {
    type: 'item',
    title: message.data.name,
    badge,
    summary: message.data.summary,
    ...iconFieldsForResource(message.data, defaultIcon),
    pages: [
      buildQuickReferenceSection(
        [
          {
            title: 'Overview',
            href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}`),
          },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(message, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}/changelog`),
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
            href: buildUrl(`/visualiser/${collection}/${message.data.id}/${message.data.version}`),
          },
          ...(hasTriggerPaths
            ? [
                {
                  type: 'item' as const,
                  title: 'Trigger paths',
                  href: buildUrl(`/triggers/${collection}/${message.data.id}/${message.data.version}`),
                },
              ]
            : []),
        ],
      },
      hasDiagrams && {
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
        pages: diagramNavItems,
      },
      hasSchema && {
        type: 'group',
        title: 'API & Contracts',
        icon: 'FileJson',
        pages: [
          {
            type: 'item',
            title: getSchemaNavTitle(resolvedSchemas),
            href: buildUrl(`/schemas/${collection}/${message.data.id}/${message.data.version}`),
          },
          hasFieldUsage && {
            type: 'item',
            title: 'Field Usage',
            href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}/field-lineage`),
          },
        ].filter(Boolean),
      },
      renderProducers && {
        type: 'group',
        title: 'Producers',
        icon: 'Server',
        pages: producers.map(getProducerConsumerPageRef),
        visible: producers.length > 0,
      },
      renderConsumers && {
        type: 'group',
        title: 'Consumers',
        icon: 'Server',
        pages: consumers.map(getProducerConsumerPageRef),
        visible: consumers.length > 0,
      },
      renderTriggeredBy && {
        type: 'group',
        title: 'Triggered by',
        icon: 'Mail',
        pages: triggeredByRefs,
        visible: triggeredByRefs.length > 0,
      },
      renderTriggers && {
        type: 'group',
        title: 'Triggers',
        icon: 'Mail',
        pages: triggerRefs,
        visible: triggerRefs.length > 0,
      },
      renderFlows && {
        type: 'group',
        title: 'Appears in flows',
        icon: 'Waypoints',
        pages: flowRefs,
        visible: flowRefs.length > 0,
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(message.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(message.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
