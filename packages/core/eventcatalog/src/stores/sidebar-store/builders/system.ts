import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
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
import { isChangelogEnabled, isVisualiserEnabled } from '@utils/feature';
import { customIconFieldsForResource } from '@utils/icon';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

// Sort resolved collection entries A-Z by their display name (falling back to id).
const byResourceName = (a: any, b: any) => (a.data?.name || a.data?.id || '').localeCompare(b.data?.name || b.data?.id || '');

/**
 * Predefined sidebar sections for a system, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type SystemSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'diagrams'
  | 'resources'
  | 'services'
  | 'flows'
  | 'data-stores'
  | 'entities'
  | 'decision-records'
  | 'owners'
  | 'code'
  | 'attachments';

export type SystemSections = Record<SystemSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_SYSTEM_SECTION_ORDER: SystemSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'diagrams',
  'resources',
  'entities',
  'owners',
  'code',
  'attachments',
];

export const buildSystemSections = (
  system: CollectionEntry<'systems'>,
  owners: any[],
  context: ResourceGroupContext
): SystemSections => {
  const servicesInSystem = [...(system.data.services || [])].sort(byResourceName);
  const renderServices = servicesInSystem.length > 0 && shouldRenderSideBarSection(system, 'services');

  const flowsInSystem = [...(system.data.flows || [])].sort(byResourceName);
  const renderFlows = flowsInSystem.length > 0 && shouldRenderSideBarSection(system, 'flows');

  const entitiesInSystem = [...(system.data.entities || [])].sort(byResourceName);
  const renderEntities = entitiesInSystem.length > 0 && shouldRenderSideBarSection(system, 'entities');

  const containersInSystem = [...(system.data.containers || [])].sort(byResourceName);
  const renderContainers = containersInSystem.length > 0 && shouldRenderSideBarSection(system, 'containers');

  // The Resources page/link only makes sense when the system actually has resources
  // attached (services, flows, entities or data stores). Mirrors what the page renders.
  const hasResources =
    servicesInSystem.length > 0 || flowsInSystem.length > 0 || entitiesInSystem.length > 0 || containersInSystem.length > 0;

  const systemDiagrams = system.data.diagrams || [];
  const diagramNavItems = buildDiagramNavItems(systemDiagrams, context.diagrams);
  const hasDiagrams = diagramNavItems.length > 0 && shouldRenderSideBarSection(system, 'diagrams');

  // A system that declares relationships to other systems, or actors, can be the starting
  // point of a Context Diagram. (Systems that are only referenced by others still get a
  // context page; here we surface the link from systems that declare something themselves.)
  const hasRelationships = (system.data.relationships || []).length > 0 || (system.data.actors || []).length > 0;

  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(system, 'owners');
  const renderRepository = system.data.repository && shouldRenderSideBarSection(system, 'repository');
  const hasAttachments = system.data.attachments && system.data.attachments.length > 0;

  const renderVisualiser = isVisualiserEnabled();

  const docsSection = buildResourceDocsSection(
    'systems',
    system.data.id,
    system.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  // Resource subsections. These are built once and shared between the "Resources"
  // umbrella (where they render as subtle subgroups) and their standalone tokens
  // (`$services`, `$flows`, `$data-stores`) for custom sidebars.
  const servicesSection: NavNode | null = renderServices
    ? {
        type: 'group',
        title: 'Services',
        icon: 'Server',
        pages: servicesInSystem.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
      }
    : null;

  const flowsSection: NavNode | null = renderFlows
    ? {
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: flowsInSystem.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
      }
    : null;

  const dataStoresSection: NavNode | null = renderContainers
    ? {
        type: 'group',
        title: 'Data Stores',
        icon: 'Database',
        pages: containersInSystem.map(
          (container) => `container:${(container as any).data.id}:${(container as any).data.version}`
        ),
      }
    : null;

  const resourceSubsections = [servicesSection, flowsSection, dataStoresSection].filter(Boolean) as NavNode[];

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        {
          title: 'Overview',
          href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}`),
        },
        hasResources && {
          title: 'System Resources',
          href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}/resources`),
        },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(system, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/systems/${system.data.id}/${system.data.version}/changelog`),
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
          title: 'Overview',
          href: buildUrl(`/architecture/systems/${system.data.id}/${system.data.version}`),
        },
        renderVisualiser &&
          hasRelationships && {
            type: 'item',
            title: 'Context Diagram',
            href: buildUrl(`/visualiser/systems/${system.data.id}/${system.data.version}/context`),
          },
        renderVisualiser && {
          type: 'item',
          title: 'Resource Diagram',
          href: buildUrl(`/visualiser/systems/${system.data.id}/${system.data.version}`),
        },
      ].filter(Boolean) as ChildRef[],
    },
    diagrams: hasDiagrams
      ? {
          type: 'group',
          title: 'Diagrams',
          icon: 'FileImage',
          pages: diagramNavItems,
        }
      : null,
    resources:
      resourceSubsections.length > 0
        ? {
            type: 'group',
            title: 'Resources',
            icon: 'Boxes',
            // Resource type subsections are ordered A-Z by their title, and the
            // resources within each subsection are ordered A-Z by name (sorted above).
            pages: resourceSubsections
              .map((section) => ({ ...section, subtle: true }))
              .sort((a, b) => a.title.localeCompare(b.title)) as ChildRef[],
          }
        : null,
    services: servicesSection,
    flows: flowsSection,
    'data-stores': dataStoresSection,
    entities: renderEntities
      ? {
          type: 'group',
          title: 'Entities',
          icon: 'Box',
          pages: entitiesInSystem.map((entity) => ({
            type: 'item',
            title: (entity as any).data?.name || (entity as any).data.id,
            href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
          })),
        }
      : null,
    'decision-records': shouldRenderSideBarSection(system, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(system, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
    code: renderRepository ? buildRepositorySection(system.data.repository as { url: string; language: string }) : null,
    attachments: hasAttachments ? buildAttachmentsSection(system.data.attachments as any[]) : null,
  };
};

export type BuildSystemNodeOptions = {
  /** A parsed `sidebar.json` for this system. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildSystemNode = (
  system: CollectionEntry<'systems'>,
  owners: any[],
  context: ResourceGroupContext,
  options: BuildSystemNodeOptions = {}
): NavNode => {
  const sections = buildSystemSections(system, owners, context);

  const pages = resolveSidebarPages(sections, DEFAULT_SYSTEM_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: { collection: 'systems', id: system.data.id, version: system.data.version, entry: system },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: system.data.name,
    badge: 'System',
    summary: system.data.summary,
    // Systems use a custom icon when defined, otherwise none — the surrounding
    // 'Systems' section header (and System badge) already convey the type, so the
    // default Group glyph on every item is redundant.
    ...customIconFieldsForResource(system.data),
    pages,
  };
};
