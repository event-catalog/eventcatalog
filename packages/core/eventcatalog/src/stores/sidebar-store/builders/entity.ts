import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef, ResourceGroupContext } from './shared';
import {
  buildAttachmentsSection,
  buildOwnersSection,
  buildQuickReferenceSection,
  buildResourceDocsSection,
  shouldRenderSideBarSection,
} from './shared';
import { isChangelogEnabled, isVisualiserEnabled } from '@utils/feature';
import { iconFieldsForResource } from '@utils/icon';

export const buildEntityNode = (entity: CollectionEntry<'entities'>, owners: any[], context: ResourceGroupContext): NavNode => {
  const domains = entity.data.domains || [];
  const services = entity.data.services || [];

  const entityMapTargets = [
    domains.length === 1 && {
      label: 'Domain',
      href: buildUrl(`/visualiser/domains/${(domains[0] as any).data.id}/${(domains[0] as any).data.version}/entity-map`),
    },
    services.length === 1 && {
      label: 'Service',
      href: buildUrl(`/visualiser/services/${(services[0] as any).data.id}/${(services[0] as any).data.version}/entity-map`),
    },
  ].filter(Boolean) as { label: string; href: string }[];

  const renderArchitecture = isVisualiserEnabled() && entityMapTargets.length > 0;
  const renderDomains = domains.length > 0 && shouldRenderSideBarSection(entity, 'domains');
  const renderServices = services.length > 0 && shouldRenderSideBarSection(entity, 'services');
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(entity, 'owners');
  const hasAttachments = entity.data.attachments && entity.data.attachments.length > 0;

  const docsSection = buildResourceDocsSection(
    'entities',
    entity.data.id,
    entity.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  return {
    type: 'item',
    title: entity.data.name,
    badge: 'Entity',
    summary: entity.data.summary,
    ...iconFieldsForResource(entity.data, 'Box'),
    pages: [
      buildQuickReferenceSection(
        [
          { title: 'Overview', href: buildUrl(`/docs/entities/${entity.data.id}/${entity.data.version}`) },
          isChangelogEnabled() &&
            shouldRenderSideBarSection(entity, 'changelog') && {
              title: 'Changelog',
              href: buildUrl(`/docs/entities/${entity.data.id}/${entity.data.version}/changelog`),
            },
        ].filter(Boolean) as { title: string; href: string }[]
      ),
      docsSection,
      renderArchitecture && {
        type: 'group',
        title: 'Architecture',
        icon: 'Workflow',
        pages: entityMapTargets.map((target) => ({
          type: 'item',
          title: entityMapTargets.length === 1 ? 'Entity Map' : `${target.label} Entity Map`,
          href: target.href,
        })),
      },
      renderDomains && {
        type: 'group',
        title: 'Domains',
        icon: 'Boxes',
        pages: domains.map((domain: any) => `domain:${domain.data.id}:${domain.data.version}`),
      },
      renderServices && {
        type: 'group',
        title: 'Services',
        icon: 'Server',
        pages: services.map((service: any) => `service:${service.data.id}:${service.data.version}`),
      },
      renderOwners && buildOwnersSection(owners),
      hasAttachments && buildAttachmentsSection(entity.data.attachments as any[]),
    ].filter(Boolean) as ChildRef[],
  };
};
