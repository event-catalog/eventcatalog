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
} from './shared';
import { isChangelogEnabled, isVisualiserEnabled } from '@utils/feature';
import { customIconFieldsForResource } from '@utils/icon';

// Sort resolved collection entries A-Z by their display name (falling back to id).
const byResourceName = (a: any, b: any) => (a.data?.name || a.data?.id || '').localeCompare(b.data?.name || b.data?.id || '');

export const buildSystemNode = (system: CollectionEntry<'systems'>, owners: any[], context: ResourceGroupContext): NavNode => {
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

  return {
    type: 'item',
    title: system.data.name,
    badge: 'System',
    summary: system.data.summary,
    // Systems use a custom icon when defined, otherwise none — the surrounding
    // 'Systems' section header (and System badge) already convey the type, so the
    // default Group glyph on every item is redundant.
    ...customIconFieldsForResource(system.data),
    pages: [
      buildQuickReferenceSection(
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
      docsSection,
      {
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
      hasDiagrams && {
        type: 'group',
        title: 'Diagrams',
        icon: 'FileImage',
        pages: diagramNavItems,
      },
      (renderServices || renderFlows || renderContainers) && {
        type: 'group',
        title: 'Resources',
        icon: 'Boxes',
        // Resource type subsections are ordered A-Z by their title, and the
        // resources within each subsection are ordered A-Z by name (sorted above).
        pages: (
          [
            renderServices && {
              type: 'group',
              title: 'Services',
              subtle: true,
              icon: 'Server',
              pages: servicesInSystem.map((service) => `service:${(service as any).data.id}:${(service as any).data.version}`),
            },
            renderFlows && {
              type: 'group',
              title: 'Flows',
              subtle: true,
              icon: 'Waypoints',
              pages: flowsInSystem.map((flow) => `flow:${(flow as any).data.id}:${(flow as any).data.version}`),
            },
            renderContainers && {
              type: 'group',
              title: 'Data Stores',
              subtle: true,
              icon: 'Database',
              pages: containersInSystem.map(
                (container) => `container:${(container as any).data.id}:${(container as any).data.version}`
              ),
            },
          ].filter(Boolean) as NavNode[]
        ).sort((a, b) => a.title.localeCompare(b.title)) as ChildRef[],
      },
      renderEntities && {
        type: 'group',
        title: 'Entities',
        icon: 'Box',
        pages: entitiesInSystem.map((entity) => ({
          type: 'item',
          title: (entity as any).data?.name || (entity as any).data.id,
          href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
        })),
      },
      renderOwners && buildOwnersSection(owners),
      renderRepository && buildRepositorySection(system.data.repository as { url: string; language: string }),
      hasAttachments && buildAttachmentsSection(system.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
