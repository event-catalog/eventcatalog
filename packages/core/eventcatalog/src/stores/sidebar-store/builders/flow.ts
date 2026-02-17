import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import { buildQuickReferenceSection, buildResourceDocsSections } from './shared';

export const buildFlowNode = (flow: CollectionEntry<'flows'>, context: ResourceGroupContext): NavNode => {
  return {
    type: 'item',
    title: flow.data.name,
    icon: 'Waypoint',
    badge: 'Flow',
    summary: flow.data.summary,
    pages: [
      buildQuickReferenceSection([{ title: 'Overview', href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}`) }]),
      ...buildResourceDocsSections('flows', flow.data.id, flow.data.version, context.resourceDocsByResource),
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
    ],
  };
};
