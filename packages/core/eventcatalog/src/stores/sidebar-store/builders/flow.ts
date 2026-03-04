import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import { buildQuickReferenceSection, buildResourceDocsSection, shouldRenderSideBarSection } from './shared';
import { isChangelogEnabled } from '@utils/feature';

export const buildFlowNode = (flow: CollectionEntry<'flows'>, context: ResourceGroupContext): NavNode => {
  const docsSection = buildResourceDocsSection(
    'flows',
    flow.data.id,
    flow.data.version,
    context.resourceDocs,
    context.resourceDocCategories
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
    ].filter(Boolean) as ChildRef[],
  };
};
