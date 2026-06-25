import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildRepositorySection,
  buildAttachmentsSection,
  buildResourceDocsSection,
} from './shared';
import { isChangelogEnabled } from '@utils/feature';
import { iconFieldsForResource } from '@utils/icon';

export const buildSystemNode = (system: CollectionEntry<'systems'>, owners: any[], context: ResourceGroupContext): NavNode => {
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(system, 'owners');
  const renderRepository = system.data.repository && shouldRenderSideBarSection(system, 'repository');
  const hasAttachments = system.data.attachments && system.data.attachments.length > 0;

  const docsSection = buildResourceDocsSection(
    'systems',
    system.data.id,
    system.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  return {
    type: 'item',
    title: system.data.name,
    badge: 'System',
    summary: system.data.summary,
    ...iconFieldsForResource(system.data, 'Group'),
    pages: [
      buildQuickReferenceSection(
        [
          {
            title: 'Overview',
            href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}`),
          },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(system, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}/changelog`),
            },
        ].filter(Boolean) as { title: string; href: string }[]
      ),
      docsSection,
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(system.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(system.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
