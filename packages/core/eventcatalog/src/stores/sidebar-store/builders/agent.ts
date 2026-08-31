import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  uniqueBy,
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildResourceGroupSections,
  buildRepositorySection,
  buildAttachmentsSection,
  buildDiagramNavItems,
  buildResourceDocsSection,
  buildArchitectureDecisionsSection,
} from './shared';
import { isChangelogEnabled } from '@utils/feature';
import { isVisualiserEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';
import { iconFieldsForResource } from '@utils/icon';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

const uniqueRefs = (refs: string[]) => [...new Set(refs)];

/**
 * Predefined sidebar sections for an agent, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type AgentSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'diagrams'
  | 'resource-groups'
  | 'state-and-persistence'
  | 'outbound-messages'
  | 'inbound-messages'
  | 'channels'
  | 'flows'
  | 'decision-records'
  | 'owners'
  | 'code'
  | 'attachments';

export type AgentSections = Record<AgentSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_AGENT_SECTION_ORDER: AgentSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'diagrams',
  'resource-groups',
  'state-and-persistence',
  'outbound-messages',
  'inbound-messages',
  'channels',
  'flows',
  'owners',
  'code',
  'attachments',
];

export const buildAgentSections = (
  agent: CollectionEntry<'agents'>,
  owners: any[],
  context: ResourceGroupContext,
  agentChannels: CollectionEntry<'channels'>[] = [],
  flowRefs: string[] = []
): AgentSections => {
  const sendsMessages = agent.data.sends || [];
  const receivesMessages = agent.data.receives || [];

  const dataStoresInAgent = uniqueBy([...(agent.data.writesTo || []), ...(agent.data.readsFrom || [])], 'id');

  const agentFlows = agent.data.flows || [];
  const agentFlowRefs = uniqueRefs([
    ...agentFlows.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
    ...flowRefs,
  ]);
  const hasFlows = agentFlowRefs.length > 0;

  const hasAttachments = agent.data.attachments && agent.data.attachments.length > 0;
  const hasDataStores = dataStoresInAgent.length > 0;
  const resourceGroups = agent.data.resourceGroups || [];
  const hasResourceGroups = resourceGroups.length > 0;

  const renderResourceGroups = hasResourceGroups && shouldRenderSideBarSection(agent, 'resourceGroups');
  const renderMessages = shouldRenderSideBarSection(agent, 'messages');
  const renderVisualiser = isVisualiserEnabled();
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(agent, 'owners');
  const renderRepository = agent.data.repository && shouldRenderSideBarSection(agent, 'repository');
  const docsSection = buildResourceDocsSection(
    'agents',
    agent.data.id,
    agent.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  const agentDiagrams = agent.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(agentDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0;

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        { title: 'Overview', href: buildUrl(`/docs/agents/${agent.data.id}/${agent.data.version}`) },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(agent, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/agents/${agent.data.id}/${agent.data.version}/changelog`),
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
              href: buildUrl(`/visualiser/agents/${agent.data.id}/${agent.data.version}`),
            },
          ].filter(Boolean) as ChildRef[],
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
    'resource-groups': renderResourceGroups
      ? (buildResourceGroupSections(resourceGroups, context).filter(Boolean) as NavNode[])
      : null,
    'state-and-persistence': hasDataStores
      ? {
          type: 'group',
          title: 'State and Persistence',
          icon: 'Database',
          pages: dataStoresInAgent.map(
            (dataStore) => `container:${(dataStore as any).data.id}:${(dataStore as any).data.version}`
          ),
        }
      : null,
    'outbound-messages':
      sendsMessages.length > 0 && renderMessages
        ? {
            type: 'group',
            title: 'Outbound Messages',
            icon: 'Mail',
            pages: sendsMessages.map(
              (message) => `${pluralizeMessageType(message as any)}:${(message as any).data.id}:${(message as any).data.version}`
            ),
          }
        : null,
    'inbound-messages':
      receivesMessages.length > 0 && renderMessages
        ? {
            type: 'group',
            title: 'Inbound Messages',
            icon: 'Mail',
            pages: receivesMessages.map(
              (receive) => `${pluralizeMessageType(receive as any)}:${(receive as any).data.id}:${(receive as any).data.version}`
            ),
          }
        : null,
    channels:
      agentChannels.length > 0
        ? {
            type: 'group',
            title: 'Channels',
            icon: 'ArrowRightLeft',
            pages: agentChannels.map((channel) => `channel:${(channel as any).data.id}:${(channel as any).data.version}`),
          }
        : null,
    flows: hasFlows
      ? {
          type: 'group',
          // If the agent declares its own flows it owns them ("Flows"); otherwise it is
          // only referenced as a step in someone else's flow ("Appears in flows").
          title: agentFlows.length > 0 ? 'Flows' : 'Appears in flows',
          icon: 'Waypoints',
          pages: agentFlowRefs,
        }
      : null,
    'decision-records': shouldRenderSideBarSection(agent, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(agent, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    code: renderRepository ? buildRepositorySection(agent.data.repository as { url: string; language: string }) : null,
    attachments: hasAttachments ? buildAttachmentsSection(agent.data.attachments as any[]) : null,
  };
};

export type BuildAgentNodeOptions = {
  /** A parsed `sidebar.json` for this agent. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildAgentNode = (
  agent: CollectionEntry<'agents'>,
  owners: any[],
  context: ResourceGroupContext,
  agentChannels: CollectionEntry<'channels'>[] = [],
  flowRefs: string[] = [],
  options: BuildAgentNodeOptions = {}
): NavNode => {
  const sections = buildAgentSections(agent, owners, context, agentChannels, flowRefs);

  const pages = resolveSidebarPages(sections, DEFAULT_AGENT_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'agents', id: agent.data.id, version: agent.data.version, entry: agent },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: agent.data.name,
    badge: 'Agent',
    summary: agent.data.summary,
    ...iconFieldsForResource(agent.data, 'Bot'),
    pages,
  };
};
