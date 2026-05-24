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
} from './shared';
import { isChangelogEnabled } from '@utils/feature';
import { isVisualiserEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';
import { iconFieldsForResource } from '@utils/icon';

const uniqueRefs = (refs: string[]) => [...new Set(refs)];

export const buildAgentNode = (
  agent: CollectionEntry<'agents'>,
  owners: any[],
  context: ResourceGroupContext,
  agentChannels: CollectionEntry<'channels'>[] = [],
  flowRefs: string[] = []
): NavNode => {
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
    type: 'item',
    title: agent.data.name,
    badge: 'Agent',
    summary: agent.data.summary,
    ...iconFieldsForResource(agent.data, 'Bot'),
    pages: [
      buildQuickReferenceSection(
        [
          { title: 'Overview', href: buildUrl(`/docs/agents/${agent.data.id}/${agent.data.version}`) },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(agent, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/agents/${agent.data.id}/${agent.data.version}/changelog`),
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
            href: buildUrl(`/visualiser/agents/${agent.data.id}/${agent.data.version}`),
          },
        ].filter(Boolean) as ChildRef[],
      },
      hasDiagrams && {
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
        pages: diagramNavItems,
      },
      renderResourceGroups && buildResourceGroupSections(resourceGroups, context),
      hasDataStores && {
        type: 'group',
        title: 'State and Persistence',
        icon: 'Database',
        pages: dataStoresInAgent.map((dataStore) => `container:${(dataStore as any).data.id}:${(dataStore as any).data.version}`),
      },
      sendsMessages.length > 0 &&
        renderMessages && {
          type: 'group',
          title: 'Outbound Messages',
          icon: 'Mail',
          pages: sendsMessages.map(
            (message) => `${pluralizeMessageType(message as any)}:${(message as any).data.id}:${(message as any).data.version}`
          ),
        },
      receivesMessages.length > 0 &&
        renderMessages && {
          type: 'group',
          title: 'Inbound Messages',
          icon: 'Mail',
          pages: receivesMessages.map(
            (receive) => `${pluralizeMessageType(receive as any)}:${(receive as any).data.id}:${(receive as any).data.version}`
          ),
        },
      agentChannels.length > 0 && {
        type: 'group',
        title: 'Channels',
        icon: 'ArrowRightLeft',
        pages: agentChannels.map((channel) => `channel:${(channel as any).data.id}:${(channel as any).data.version}`),
      },
      hasFlows && {
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: agentFlowRefs,
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(agent.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(agent.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
