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
  buildArchitectureDecisionsSection,
} from './shared';
import { isVisualiserEnabled, isChangelogEnabled } from '@utils/feature';
import { iconFieldsForResource } from '@utils/icon';
import { collectionToResourceMap } from '@utils/collections/util';
import type { MessageTrigger } from '@utils/collections/message-triggers';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

type MessageSchemaEntry = CollectionEntry<'schemas'>;
type MessageEntry = CollectionEntry<'events' | 'commands' | 'queries'>;
type MessageTriggers = { triggers: MessageTrigger[]; triggeredBy: MessageTrigger[] };

const getProducerConsumerPageRef = (resource: any) => {
  const resourceType = collectionToResourceMap[resource.collection as keyof typeof collectionToResourceMap];
  return `${resourceType}:${resource.data.id}:${resource.data.version}`;
};

const getSchemasForMessage = (message: MessageEntry, schemas: MessageSchemaEntry[] = []) => {
  return schemas.filter(
    (schema) =>
      schema.data.message.collectionName === message.collection &&
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

/**
 * Predefined sidebar sections for a message (event, command or query), keyed by the token
 * users reference from `sidebar.json` (e.g. `$quick-reference`). Each token is the
 * kebab-cased title of the section as it appears in the default sidebar.
 */
export type MessageSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'diagrams'
  | 'api-and-contracts'
  | 'producers'
  | 'consumers'
  | 'triggered-by'
  | 'triggers'
  | 'appears-in-flows'
  | 'decision-records'
  | 'owners'
  | 'code'
  | 'attachments';

export type MessageSections = Record<MessageSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_MESSAGE_SECTION_ORDER: MessageSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'diagrams',
  'api-and-contracts',
  'producers',
  'consumers',
  'triggered-by',
  'triggers',
  'appears-in-flows',
  'owners',
  'code',
  'attachments',
];

export const buildMessageSections = (
  message: MessageEntry,
  owners: any[],
  context: ResourceGroupContext,
  hasFieldUsage: boolean = false,
  flowRefs: string[] = [],
  messageTriggers: MessageTriggers = { triggers: [], triggeredBy: [] }
): MessageSections => {
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
    'quick-reference': buildQuickReferenceSection(
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
    documentation: docsSection,
    architecture: renderVisualiser
      ? {
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
        }
      : null,
    diagrams: hasDiagrams
      ? {
          type: 'group',
          title: 'Diagrams',
          icon: 'FileImage',
          pages: diagramNavItems,
        }
      : null,
    'api-and-contracts': hasSchema
      ? {
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
          ].filter(Boolean) as ChildRef[],
        }
      : null,
    producers: renderProducers
      ? {
          type: 'group',
          title: 'Producers',
          icon: 'Server',
          pages: producers.map(getProducerConsumerPageRef),
          visible: producers.length > 0,
        }
      : null,
    consumers: renderConsumers
      ? {
          type: 'group',
          title: 'Consumers',
          icon: 'Server',
          pages: consumers.map(getProducerConsumerPageRef),
          visible: consumers.length > 0,
        }
      : null,
    'triggered-by': renderTriggeredBy
      ? {
          type: 'group',
          title: 'Triggered by',
          icon: 'Mail',
          pages: triggeredByRefs,
          visible: triggeredByRefs.length > 0,
        }
      : null,
    triggers: renderTriggers
      ? {
          type: 'group',
          title: 'Triggers',
          icon: 'Mail',
          pages: triggerRefs,
          visible: triggerRefs.length > 0,
        }
      : null,
    'appears-in-flows': renderFlows
      ? {
          type: 'group',
          title: 'Appears in flows',
          icon: 'Waypoints',
          pages: flowRefs,
          visible: flowRefs.length > 0,
        }
      : null,
    'decision-records': shouldRenderSideBarSection(message, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(message, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    code: renderRepository ? buildRepositorySection(message.data.repository as { url: string; language: string }) : null,
    attachments: hasAttachments ? buildAttachmentsSection(message.data.attachments as any[]) : null,
  };
};

export type BuildMessageNodeOptions = {
  /** A parsed `sidebar.json` for this message. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildMessageNode = (
  message: MessageEntry,
  owners: any[],
  context: ResourceGroupContext,
  hasFieldUsage: boolean = false,
  flowRefs: string[] = [],
  messageTriggers: MessageTriggers = { triggers: [], triggeredBy: [] },
  options: BuildMessageNodeOptions = {}
): NavNode => {
  const collection = message.collection;

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

  const sections = buildMessageSections(message, owners, context, hasFieldUsage, flowRefs, messageTriggers);

  const pages = resolveSidebarPages(sections, DEFAULT_MESSAGE_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection, id: message.data.id, version: message.data.version, entry: message },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: message.data.name,
    badge,
    summary: message.data.summary,
    ...iconFieldsForResource(message.data, defaultIcon),
    pages,
  };
};
