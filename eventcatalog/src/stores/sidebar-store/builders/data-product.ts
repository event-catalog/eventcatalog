import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef } from './shared';
import { buildQuickReferenceSection, buildOwnersSection, shouldRenderSideBarSection } from './shared';
import { isVisualiserEnabled } from '@utils/feature';
import { getItemsFromCollectionByIdAndSemverOrLatest, sortVersioned } from '@utils/collections/util';
import { getSchemaFormatFromURL } from '@utils/collections/schemas';

interface DataProductContext {
  events: CollectionEntry<'events'>[];
  commands: CollectionEntry<'commands'>[];
  queries: CollectionEntry<'queries'>[];
  services: CollectionEntry<'services'>[];
  containers: CollectionEntry<'containers'>[];
  channels: CollectionEntry<'channels'>[];
}

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

export const buildDataProductNode = (
  dataProduct: CollectionEntry<'data-products'>,
  owners: any[],
  context: DataProductContext
): NavNode => {
  const inputs = dataProduct.data.inputs || [];
  const outputs = dataProduct.data.outputs || [];

  const renderVisualiser = isVisualiserEnabled();
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(dataProduct, 'owners');

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
    type: 'item',
    title: dataProduct.data.name,
    badge: 'Data Product',
    summary: dataProduct.data.summary,
    pages: [
      buildQuickReferenceSection([
        { title: 'Overview', href: buildUrl(`/docs/data-products/${dataProduct.data.id}/${dataProduct.data.version}`) },
      ]),
      renderVisualiser && {
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
      },
      resolvedInputs.length > 0 && {
        type: 'group',
        title: 'Inputs',
        icon: 'ArrowDownToLine',
        pages: resolvedInputs,
      },
      resolvedOutputs.length > 0 && {
        type: 'group',
        title: 'Outputs',
        icon: 'ArrowUpFromLine',
        pages: resolvedOutputs,
      },
      dataContracts.length > 0 && {
        type: 'group',
        title: 'Data Contracts',
        icon: 'FileCheck',
        pages: dataContracts,
      },
      renderOwners && buildOwnersSection(owners),
    ].filter(Boolean) as ChildRef[],
  };
};
