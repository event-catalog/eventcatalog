import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildResourceDocsSection,
  shouldRenderSideBarSection,
  buildArchitectureDecisionsSection,
} from './shared';
import { isChangelogEnabled } from '@utils/feature';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { pluralizeMessageType } from '@utils/collections/messages';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

type VersionedEntry = { collection?: string; data: { id: string; version: string } };
type VersionedEntryMap<T extends VersionedEntry> = Map<string, T[]>;

const uniqueRefs = (refs: string[]) => [...new Set(refs)];

const resolvePointer = <T extends VersionedEntry>(
  map: VersionedEntryMap<T>,
  pointer: { id: string; version?: string }
): T | undefined => {
  return findInMap(map, pointer.id, pointer.version);
};

const resolveMessageStep = (
  step: any,
  maps: {
    eventMap: VersionedEntryMap<CollectionEntry<'events'>>;
    commandMap: VersionedEntryMap<CollectionEntry<'commands'>>;
    queryMap: VersionedEntryMap<CollectionEntry<'queries'>>;
  }
): string | null => {
  if (!step.message) return null;

  const hydratedMessage = Array.isArray(step.message) ? step.message[0] : undefined;
  if (hydratedMessage?.collection && hydratedMessage?.data) {
    return `${pluralizeMessageType(hydratedMessage as any)}:${hydratedMessage.data.id}:${hydratedMessage.data.version}`;
  }

  const pointer = Array.isArray(step.message) ? undefined : step.message;
  if (!pointer?.id) return null;

  const message =
    resolvePointer(maps.eventMap, pointer) || resolvePointer(maps.commandMap, pointer) || resolvePointer(maps.queryMap, pointer);

  return message ? `${pluralizeMessageType(message as any)}:${message.data.id}:${message.data.version}` : null;
};

/**
 * Predefined sidebar sections for a flow, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type FlowSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'messages'
  | 'services'
  | 'agents'
  | 'subflows'
  | 'data-stores'
  | 'data-products'
  | 'decision-records';

export type FlowSections = Record<FlowSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is appended by `withArchitectureDecisionsSection` in state.ts,
 * and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_FLOW_SECTION_ORDER: FlowSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'messages',
  'services',
  'agents',
  'subflows',
  'data-stores',
  'data-products',
];

export const buildFlowSections = (flow: CollectionEntry<'flows'>, context: ResourceGroupContext): FlowSections => {
  const docsSection = buildResourceDocsSection(
    'flows',
    flow.data.id,
    flow.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );
  const steps = flow.data.steps || [];
  const eventMap = createVersionedMap(context.events);
  const commandMap = createVersionedMap(context.commands);
  const queryMap = createVersionedMap(context.queries);
  const agentMap = createVersionedMap(context.agents || []);
  const serviceMap = createVersionedMap(context.services);
  const flowMap = createVersionedMap(context.flows);
  const containerMap = createVersionedMap(context.containers);
  const dataProductMap = createVersionedMap(context.dataProducts);
  const messageRefs = uniqueRefs(
    steps.map((step) => resolveMessageStep(step, { eventMap, commandMap, queryMap })).filter(Boolean) as string[]
  );
  const serviceRefs = uniqueRefs(
    steps
      .map((step) => (step.service ? resolvePointer(serviceMap, step.service) : undefined))
      .filter(Boolean)
      .map((service) => `service:${service!.data.id}:${service!.data.version}`)
  );
  const agentRefs = uniqueRefs(
    steps
      .map((step: any) => {
        const hydratedAgent = Array.isArray(step.agent) ? step.agent[0] : undefined;
        if (hydratedAgent?.collection && hydratedAgent?.data) return hydratedAgent;

        const pointer = Array.isArray(step.agent) ? undefined : step.agent;
        return pointer ? resolvePointer(agentMap, pointer) : undefined;
      })
      .filter(Boolean)
      .map((agent) => `agent:${agent!.data.id}:${agent!.data.version}`)
  );
  const flowRefs = uniqueRefs(
    steps
      .map((step) => (step.flow ? resolvePointer(flowMap, step.flow) : undefined))
      .filter(Boolean)
      .map((referencedFlow) => `flow:${referencedFlow!.data.id}:${referencedFlow!.data.version}`)
  );
  const containerRefs = uniqueRefs(
    steps
      .map((step: any) => {
        const hydratedContainer = Array.isArray(step.container) ? step.container[0] : undefined;
        if (hydratedContainer?.collection && hydratedContainer?.data) return hydratedContainer;

        const pointer = Array.isArray(step.container) ? undefined : step.container;
        return pointer ? resolvePointer(containerMap, pointer) : undefined;
      })
      .filter(Boolean)
      .map((container) => `container:${container!.data.id}:${container!.data.version}`)
  );
  const dataProductRefs = uniqueRefs(
    steps
      .map((step: any) => {
        const hydratedDataProduct = Array.isArray(step.dataProduct) ? step.dataProduct[0] : undefined;
        if (hydratedDataProduct?.collection && hydratedDataProduct?.data) return hydratedDataProduct;

        const pointer = Array.isArray(step.dataProduct) ? undefined : step.dataProduct;
        return pointer ? resolvePointer(dataProductMap, pointer) : undefined;
      })
      .filter(Boolean)
      .map((dataProduct) => `data-product:${dataProduct!.data.id}:${dataProduct!.data.version}`)
  );

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        { title: 'Overview', href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}`) },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(flow, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}/changelog`),
          },
      ].filter(Boolean) as { title: string; href: string }[]
    ),
    documentation: docsSection,
    architecture: {
      type: 'group',
      title: 'Architecture',
      icon: 'Workflow',
      pages: [
        {
          type: 'item',
          title: 'Flow Diagram',
          href: buildUrl(`/visualiser/flows/${flow.data.id}/${flow.data.version}`),
        },
      ].filter(Boolean) as ChildRef[],
    },
    messages:
      messageRefs.length > 0
        ? {
            type: 'group',
            title: 'Messages',
            icon: 'Mail',
            pages: messageRefs,
          }
        : null,
    services:
      serviceRefs.length > 0
        ? {
            type: 'group',
            title: 'Services',
            icon: 'Server',
            pages: serviceRefs,
          }
        : null,
    agents:
      agentRefs.length > 0
        ? {
            type: 'group',
            title: 'Agents',
            icon: 'Bot',
            pages: agentRefs,
          }
        : null,
    subflows:
      flowRefs.length > 0
        ? {
            type: 'group',
            title: 'Subflows',
            icon: 'Waypoints',
            pages: flowRefs,
          }
        : null,
    'data-stores':
      containerRefs.length > 0
        ? {
            type: 'group',
            title: 'Data Stores',
            icon: 'Database',
            pages: containerRefs,
          }
        : null,
    'data-products':
      dataProductRefs.length > 0
        ? {
            type: 'group',
            title: 'Data Products',
            icon: 'Package',
            pages: dataProductRefs,
          }
        : null,
    'decision-records': shouldRenderSideBarSection(flow, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(flow, context.adrs || [])
      : null,
  };
};

export type BuildFlowNodeOptions = {
  /** A parsed `sidebar.json` for this flow. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildFlowNode = (
  flow: CollectionEntry<'flows'>,
  context: ResourceGroupContext,
  options: BuildFlowNodeOptions = {}
): NavNode => {
  const sections = buildFlowSections(flow, context);

  const pages = resolveSidebarPages(sections, DEFAULT_FLOW_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'flows', id: flow.data.id, version: flow.data.version, entry: flow },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: flow.data.name,
    icon: 'Waypoint',
    badge: 'Flow',
    summary: flow.data.summary,
    pages,
  };
};
