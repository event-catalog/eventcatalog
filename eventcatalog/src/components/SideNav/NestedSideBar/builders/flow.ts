import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef } from './shared';
import { buildQuickReferenceSection } from './shared';

export const buildFlowNode = (flow: CollectionEntry<'flows'>): NavNode => {
  return {
    type: 'item',
    title: flow.data.name,
    icon: 'Waypoint',
    badge: 'Flow',
    children: [
      buildQuickReferenceSection([
        { title: 'Overview', href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}`) },
      ]),
      {
        type: 'section',
        title: 'Architecture & Design',
        icon: 'Workflow',
        children: [
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

