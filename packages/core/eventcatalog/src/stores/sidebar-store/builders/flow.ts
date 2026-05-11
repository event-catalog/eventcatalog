import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import { buildQuickReferenceSection, buildResourceDocsSection, shouldRenderSideBarSection } from './shared';
import { isChangelogEnabled } from '@utils/feature';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { pluralizeMessageType } from '@utils/collections/messages';

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

export const buildFlowNode = (flow: CollectionEntry<'flows'>, context: ResourceGroupContext): NavNode => {
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
  const serviceMap = createVersionedMap(context.services);
  const flowMap = createVersionedMap(context.flows);
  const messageRefs = uniqueRefs(
    steps.map((step) => resolveMessageStep(step, { eventMap, commandMap, queryMap })).filter(Boolean) as string[]
  );
  const serviceRefs = uniqueRefs(
    steps
      .map((step) => (step.service ? resolvePointer(serviceMap, step.service) : undefined))
      .filter(Boolean)
      .map((service) => `service:${service!.data.id}:${service!.data.version}`)
  );
  const flowRefs = uniqueRefs(
    steps
      .map((step) => (step.flow ? resolvePointer(flowMap, step.flow) : undefined))
      .filter(Boolean)
      .map((referencedFlow) => `flow:${referencedFlow!.data.id}:${referencedFlow!.data.version}`)
  );

  return {
    type: 'item',
    title: flow.data.name,
    icon: 'Waypoint',
    badge: 'Flow',
    summary: flow.data.summary,
    pages: [
      buildQuickReferenceSection(
        [
          { title: 'Overview', href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}`) },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(flow, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}/changelog`),
            },
        ].filter(Boolean) as { title: string; href: string }[]
      ),
      docsSection,
      {
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
      messageRefs.length > 0 && {
        type: 'group',
        title: 'Messages',
        icon: 'Mail',
        pages: messageRefs,
      },
      serviceRefs.length > 0 && {
        type: 'group',
        title: 'Services',
        icon: 'Server',
        pages: serviceRefs,
      },
      flowRefs.length > 0 && {
        type: 'group',
        title: 'Subflows',
        icon: 'Waypoints',
        pages: flowRefs,
      },
    ].filter(Boolean) as ChildRef[],
  };
};
