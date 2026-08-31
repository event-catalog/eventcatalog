import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ResourceGroupContext } from './shared';
import {
  buildQuickReferenceSection,
  buildOwnersSection,
  shouldRenderSideBarSection,
  buildResourceDocsSection,
  buildArchitectureDecisionsSection,
} from './shared';
import { isVisualiserEnabled, isChangelogEnabled } from '@utils/feature';
import { getItemsFromCollectionByIdAndSemverOrLatest, sortVersioned } from '@utils/collections/util';
import { getSchemaFormatFromURL } from '@utils/collections/schemas';
import { iconFieldsForResource } from '@utils/icon';
import { resolveSidebarPages, toCustomSidebarContext, type SidebarSpec } from '../custom-sidebar';

type DataProductContext = Pick<
  ResourceGroupContext,
  'events' | 'commands' | 'queries' | 'services' | 'containers' | 'resourceDocs' | 'resourceDocCategories'
> &
  Partial<Pick<ResourceGroupContext, 'adrs'>> & {
    channels: CollectionEntry<'channels'>[];
  };

// Get highest version from matched items (semver ranges may return multiple matches)
const getHighestVersion = <T extends { data: { version: string } }>(items: T[]): T | undefined => {
  if (items.length === 0) return undefined;
  if (items.length === 1) return items[0];
  const sorted = sortVersioned(items, (item) => item.data.version);
  return sorted[0];
};

// Resolve a pointer to its collection type and format as sidebar reference
// Note: Messages use plural keys (events:, commands:, queries:) while other resources use singular
const resolvePointerToRef = (pointer: { id: string; version?: string }, context: DataProductContext): string | null => {
  const { id, version } = pointer;

  // Check each collection type using semver resolution - messages use plural keys in the sidebar
  const events = getItemsFromCollectionByIdAndSemverOrLatest(context.events, id, version);
  const event = getHighestVersion(events);
  if (event) return `events:${id}:${event.data.version}`;

  const commands = getItemsFromCollectionByIdAndSemverOrLatest(context.commands, id, version);
  const command = getHighestVersion(commands);
  if (command) return `commands:${id}:${command.data.version}`;

  const queries = getItemsFromCollectionByIdAndSemverOrLatest(context.queries, id, version);
  const query = getHighestVersion(queries);
  if (query) return `queries:${id}:${query.data.version}`;

  // Non-message resources use singular keys
  const services = getItemsFromCollectionByIdAndSemverOrLatest(context.services, id, version);
  const service = getHighestVersion(services);
  if (service) return `service:${id}:${service.data.version}`;

  const containers = getItemsFromCollectionByIdAndSemverOrLatest(context.containers, id, version);
  const container = getHighestVersion(containers);
  if (container) return `container:${id}:${container.data.version}`;

  const channels = getItemsFromCollectionByIdAndSemverOrLatest(context.channels, id, version);
  const channel = getHighestVersion(channels);
  if (channel) return `channel:${id}:${channel.data.version}`;

  // Unknown type - skip it
  return null;
};

/**
 * Predefined sidebar sections for a data product, keyed by the token users reference from
 * `sidebar.json` (e.g. `$quick-reference`). Each token is the kebab-cased title of the
 * section as it appears in the default sidebar.
 */
export type DataProductSectionKey =
  | 'quick-reference'
  | 'documentation'
  | 'architecture'
  | 'inputs'
  | 'outputs'
  | 'data-contracts'
  | 'appears-in-flows'
  | 'decision-records'
  | 'owners';

export type DataProductSections = Record<DataProductSectionKey, NavNode | NavNode[] | null>;

/**
 * Order of sections in the default (generated) sidebar. `decision-records` is deliberately
 * absent — in default mode it is inserted before Owners by `withArchitectureDecisionsSection`
 * in state.ts, and only becomes a first-class token for custom sidebars.
 */
export const DEFAULT_DATA_PRODUCT_SECTION_ORDER: DataProductSectionKey[] = [
  'quick-reference',
  'documentation',
  'architecture',
  'inputs',
  'outputs',
  'data-contracts',
  'appears-in-flows',
  'owners',
];

export const buildDataProductSections = (
  dataProduct: CollectionEntry<'data-products'>,
  owners: any[],
  context: DataProductContext,
  flowRefs: string[] = []
): DataProductSections => {
  const inputs = dataProduct.data.inputs || [];
  const outputs = dataProduct.data.outputs || [];

  const renderVisualiser = isVisualiserEnabled();
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(dataProduct, 'owners');
  const renderFlows = flowRefs.length > 0 && shouldRenderSideBarSection(dataProduct, 'flows');
  const docsSection = buildResourceDocsSection(
    'data-products',
    dataProduct.data.id,
    dataProduct.data.version,
    context.resourceDocs,
    context.resourceDocCategories
  );

  // Resolve inputs and outputs to their proper sidebar references
  const resolvedInputs = inputs.map((input) => resolvePointerToRef(input, context)).filter(Boolean) as string[];
  const resolvedOutputs = outputs.map((output) => resolvePointerToRef(output, context)).filter(Boolean) as string[];

  // Extract data contracts from outputs that have a contract field
  const dataContracts = outputs
    .filter((output) => output.contract)
    .map((output) => ({
      type: 'item' as const,
      title: `${output.contract!.name} (${getSchemaFormatFromURL(output.contract!.path).toUpperCase()})`,
      summary: output.contract!.type ? `Type: ${output.contract!.type}` : undefined,
      href: buildUrl(
        `/schemas/data-products/${dataProduct.data.id}/${dataProduct.data.version}?contract=${encodeURIComponent(output.contract!.path)}`
      ),
    }));

  return {
    'quick-reference': buildQuickReferenceSection(
      [
        { title: 'Overview', href: buildUrl(`/docs/data-products/${dataProduct.data.id}/${dataProduct.data.version}`) },
        isChangelogEnabled() &&
          shouldRenderSideBarSection(dataProduct, 'changelog') && {
            title: 'Changelog',
            href: buildUrl(`/docs/data-products/${dataProduct.data.id}/${dataProduct.data.version}/changelog`),
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
              href: buildUrl(`/visualiser/data-products/${dataProduct.data.id}/${dataProduct.data.version}`),
            },
          ],
        }
      : null,
    inputs:
      resolvedInputs.length > 0
        ? {
            type: 'group',
            title: 'Inputs',
            icon: 'ArrowDownToLine',
            pages: resolvedInputs,
          }
        : null,
    outputs:
      resolvedOutputs.length > 0
        ? {
            type: 'group',
            title: 'Outputs',
            icon: 'ArrowUpFromLine',
            pages: resolvedOutputs,
          }
        : null,
    'data-contracts':
      dataContracts.length > 0
        ? {
            type: 'group',
            title: 'Data Contracts',
            icon: 'FileCheck',
            pages: dataContracts,
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
    'decision-records': shouldRenderSideBarSection(dataProduct, 'architectureDecisions')
      ? buildArchitectureDecisionsSection(dataProduct, context.adrs || [])
      : null,
    owners: renderOwners ? buildOwnersSection(owners) : null,
  };
};

export type BuildDataProductNodeOptions = {
  /** A parsed `sidebar.json` for this data product. When present it replaces the generated sidebar. */
  sidebar?: SidebarSpec;
};

export const buildDataProductNode = (
  dataProduct: CollectionEntry<'data-products'>,
  owners: any[],
  context: DataProductContext,
  flowRefs: string[] = [],
  options: BuildDataProductNodeOptions = {}
): NavNode => {
  const sections = buildDataProductSections(dataProduct, owners, context, flowRefs);

  const pages = resolveSidebarPages(sections, DEFAULT_DATA_PRODUCT_SECTION_ORDER, {
    sidebar: options.sidebar,
    resource: {
      collection: 'data-products',
      id: dataProduct.data.id,
      version: dataProduct.data.version,
      entry: dataProduct,
    },
    context: toCustomSidebarContext(context),
  });

  return {
    type: 'item',
    title: dataProduct.data.name,
    badge: 'Data Product',
    summary: dataProduct.data.summary,
    ...iconFieldsForResource(dataProduct.data, 'Package'),
    pages,
  };
};
