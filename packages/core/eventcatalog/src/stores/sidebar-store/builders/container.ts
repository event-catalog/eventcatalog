import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ResourceGroupContext } from './shared';
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
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

/**
 * Predefined sidebar sections for a container, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type ContainerSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'diagrams'
  | 'writes'
  | 'reads'
  | 'appears-in-flows'
  | 'decision-records'
  | 'owners'
  | 'code'
  | 'attachments';

export type ContainerSections = Record<ContainerSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_CONTAINER_SECTION_ORDER: ContainerSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'diagrams',
  'writes',
  'reads',
  'appears-in-flows',
  'owners',
  'code',
  'attachments',
];

export const buildContainerSections = (
  container: CollectionEntry<'containers'>,
  owners: any[],
  context: ResourceGroupContext,
  flowRefs: string[] = []
): ContainerSections => {
  const servicesWritingToContainer = container.data.servicesThatWriteToContainer || [];
  const servicesReadingFromContainer = container.data.servicesThatReadFromContainer || [];
  const dataProductsWritingToContainer = (container.data as any).dataProductsThatWriteToContainer || [];
  const dataProductsReadingFromContainer = (container.data as any).dataProductsThatReadFromContainer || [];

  // Combine writes: services + data products
  const allWrites = [
    ...servicesWritingToContainer.map((s: any) => `service:${s.data.id}:${s.data.version}`),
    ...dataProductsWritingToContainer.map((dp: any) => `data-product:${dp.data.id}:${dp.data.version}`),
  ];
  const renderWrites = allWrites.length > 0 && shouldRenderSideBarSection(container, 'services');

  // Combine reads: services + data products
  const allReads = [
    ...servicesReadingFromContainer.map((s: any) => `service:${s.data.id}:${s.data.version}`),
    ...dataProductsReadingFromContainer.map((dp: any) => `data-product:${dp.data.id}:${dp.data.version}`),
  ];
  const renderReads = allReads.length > 0 && shouldRenderSideBarSection(container, 'services');
  const renderFlows = flowRefs.length > 0 && shouldRenderSideBarSection(container, 'flows');

  const renderVisualiser = isVisualiserEnabled();

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(container, 'owners');

  const hasAttachments = container.data.attachments && container.data.attachments.length > 0;

  const renderRepository = container.data.repository && shouldRenderSideBarSection(container, 'repository');
  const docsSection = buildResourceDocsSection(
    'containers',
    container.data.id,
    container.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  // Diagrams
  const containerDiagrams = container.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(containerDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0;

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        {
          title: 'Overview',
          href: buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`),
        },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(container, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/containers/${container.data.id}/${container.data.version}/changelog`),
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
              href: buildUrl(`/visualiser/containers/${container.data.id}/${container.data.version}`),
            },
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
    writes: renderWrites
      ? {
          type: 'group',
          title: 'Writes',
          icon: 'ArrowUpFromLine',
          pages: allWrites,
        }
      : null,
    reads: renderReads
      ? {
          type: 'group',
          title: 'Reads',
          icon: 'ArrowDownToLine',
          pages: allReads,
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
    'decision-records': shouldRenderSideBarSection(container, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(container, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    code: renderRepository ? buildRepositorySection(container.data.repository as { url: string; language: string }) : null,
    attachments: hasAttachments ? buildAttachmentsSection(container.data.attachments as any[]) : null,
  };
};

export type BuildContainerNodeOptions = {
  /** A parsed `sidebar.json` for this container. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildContainerNode = (
  container: CollectionEntry<'containers'>,
  owners: any[],
  context: ResourceGroupContext,
  flowRefs: string[] = [],
  options: BuildContainerNodeOptions = {}
): NavNode => {
  const sections = buildContainerSections(container, owners, context, flowRefs);

  const pages = resolveSidebarPages(sections, DEFAULT_CONTAINER_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'containers', id: container.data.id, version: container.data.version, entry: container },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: container.data.name,
    badge: 'Container',
    summary: container.data.summary,
    ...iconFieldsForResource(container.data, 'Database'),
    pages,
  };
};
