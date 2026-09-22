import { createHash } from 'node:crypto';
import type { SchemaItem, SchemaDetails, Producer, Consumer, MessageChannel } from '@components/SchemaExplorer/types';
import { getEvents } from '@utils/collections/events';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import { getServices, getSpecificationsForService } from '@utils/collections/services';
import { getDomains, getSpecificationsForDomain } from '@utils/collections/domains';
import { getDataProducts } from '@utils/collections/data-products';
import { getAgents } from '@utils/collections/agents';
import { getFlowsForMessages } from '@utils/collections/flows';
import { getOwner } from '@utils/collections/owners';
import { buildUrl } from '@utils/url-builder';
import { getSchemaExtensionForFormat } from '@utils/collections/schemas';
import { resourceFileExists, readResourceFile } from '@utils/resource-files';
import { getExamplesForResource } from '@utils/collections/examples';
import { attachFlowGraphs, getMessageUsageGraph } from '@utils/schema-usage-graph';
import { getCollection } from 'astro:content';
import path from 'path';

// Helper function to enrich owners with full details
async function enrichOwners(ownersRaw: any[]) {
  if (!ownersRaw || ownersRaw.length === 0) return [];

  const owners = await Promise.all(ownersRaw.map(getOwner));
  const filteredOwners = owners.filter((o) => o !== undefined);

  return filteredOwners.map((o) => ({
    id: o.data.id,
    name: o.data.name,
    type: o.collection,
    href: buildUrl(`/docs/${o.collection}/${o.data.id}`),
  }));
}

async function buildRegistry() {
  // Fetch all messages
  const events = await getEvents({ getAllVersions: true, hydrateServices: false });
  const commands = await getCommands({ getAllVersions: true, hydrateServices: false });
  const queries = await getQueries({ getAllVersions: true, hydrateServices: false });
  const schemaEntries = await getCollection('schemas');

  // Fetch all services
  const services = await getServices({ getAllVersions: true });
  // Producers and consumers can be services, agents, or data products. Index all three so
  // compact { id, version } references can be resolved to a resource for display.
  const [agents, dataProductsForRelationships] = await Promise.all([
    getAgents({ getAllVersions: true }),
    getDataProducts({ getAllVersions: true }),
  ]);
  type RelationshipResource = (typeof services)[number] | (typeof agents)[number] | (typeof dataProductsForRelationships)[number];
  const relationshipResources: RelationshipResource[] = [...services, ...agents, ...dataProductsForRelationships];
  const resourcesByReference = new Map<string, RelationshipResource>();
  const latestResourceById = new Map<string, RelationshipResource>();
  for (const resource of relationshipResources) {
    resourcesByReference.set(`${resource.data.id}:${resource.data.version}`, resource);
    if (!latestResourceById.has(resource.data.id)) latestResourceById.set(resource.data.id, resource);
  }
  const toSchemaRelationships = (references: unknown): Producer[] =>
    ((references as { id: string; version: string }[] | undefined) ?? []).map((reference) => {
      const resource = resourcesByReference.get(`${reference.id}:${reference.version}`) ?? latestResourceById.get(reference.id);
      return {
        id: reference.id,
        version: reference.version,
        ...(resource ? { collection: resource.collection as Producer['collection'] } : {}),
        ...(resource?.data.name ? { name: resource.data.name } : {}),
        ...(resource?.data.summary ? { summary: resource.data.summary } : {}),
      };
    });
  const toMessageChannels = (channels: unknown): MessageChannel[] =>
    ((channels as { data: { id: string; version: string; name?: string } }[] | undefined) ?? []).map((channel) => ({
      id: channel.data.id,
      version: channel.data.version,
      ...(channel.data.name ? { name: channel.data.name } : {}),
    }));

  // Combine all messages
  const allMessages = [...events, ...commands, ...queries];
  const messagesBySchemaReference = new Map(
    allMessages.map((message) => [`${message.collection}:${message.data.id}:${message.data.version}`, message])
  );
  const flowsByMessage = await getFlowsForMessages(allMessages);

  // Read message schemas from the generated schemas collection.
  const messagesWithSchemas = await Promise.all(
    schemaEntries.map(async (schema) => {
      const message = messagesBySchemaReference.get(
        `${schema.data.message.collectionName}:${schema.data.message.id}:${schema.data.message.version}`
      );
      const schemaPath = schema.data.file || schema.data.source.path || '';
      const schemaExtension = path.extname(schemaPath).slice(1) || getSchemaExtensionForFormat(schema.data.format);
      // The collection types describe raw content references. With
      // hydrateServices: false, the loaders return compact { id, version } pairs,
      // so look the service name and summary up for display.
      const producers = toSchemaRelationships(message?.data.producers);
      const consumers = toSchemaRelationships(message?.data.consumers);
      const channels = toMessageChannels(message?.data.messageChannels);
      const flows =
        flowsByMessage.get(`${schema.data.message.collectionName}:${schema.data.message.id}:${schema.data.message.version}`) ??
        [];

      return {
        collection: schema.data.message.collectionName,
        data: {
          id: schema.data.message.id,
          name: schema.data.message.name || message?.data.name || schema.data.name || schema.data.message.id,
          version: schema.data.message.version,
          summary: schema.data.message.summary || message?.data.summary,
          schemaPath,
          owners: await enrichOwners(schema.data.message.owners || []),
          // The list shows only the first producer's label; keep this bounded
          // regardless of how many resources reference the message.
          producerName: producers[0]?.id,
        },
        loadDetails: async () => {
          let examples: SchemaDetails['examples'] = [];
          let graph: SchemaDetails['graph'];
          if (message) {
            try {
              examples = getExamplesForResource(message);
            } catch (error) {
              console.error(`Error reading examples for ${message.data.id}:`, error);
            }
            try {
              graph = await getMessageUsageGraph({
                collection: message.collection,
                id: message.data.id,
                version: message.data.version,
              });
            } catch (error) {
              console.error(`Error building usage graph for ${message.data.id}:`, error);
            }
          }
          return {
            schemaContent: schema.data.content || '',
            examples,
            ...(graph ? { graph } : {}),
            data: {
              producers,
              consumers,
              flows: await attachFlowGraphs(flows, { id: schema.data.message.id, version: schema.data.message.version }),
              channels,
            },
          };
        },
        schemaExtension,
        ...(schema.data.name ? { schemaName: schema.data.name } : {}),
        ...(schema.data.ref ? { schemaRef: schema.data.ref, source: schema.data.source } : {}),
      };
    })
  );

  // Filter services with specifications and read spec content - only keep essential data
  const servicesWithSpecs = await Promise.all(
    services.map(async (service) => {
      try {
        const specifications = getSpecificationsForService(service);

        if (specifications.length === 0) {
          return null;
        }

        return await Promise.all(
          specifications.map(async (spec) => {
            if (!resourceFileExists(service, spec.path)) {
              return null;
            }

            const schemaExtension = spec.type;
            const enrichedOwners = await enrichOwners(service.data.owners || []);

            return {
              collection: 'services',
              data: {
                id: `${service.data.id}`,
                name: `${service.data.name} - ${spec.name}`,
                version: service.data.version,
                summary: service.data.summary,
                schemaPath: spec.path,
                owners: enrichedOwners,
              },
              loadDetails: () => ({ schemaContent: readResourceFile(service, spec.path) ?? '', examples: [] }),
              schemaExtension,
              specType: spec.type,
              specName: spec.name,
              specFilenameWithoutExtension: spec.filenameWithoutExtension,
            };
          })
        );
      } catch (error) {
        console.error(`Error reading specifications for service ${service.data.id}:`, error);
        return null;
      }
    })
  );

  // Flatten and filter out null values
  const flatServicesWithSpecs = servicesWithSpecs.flat().filter((service) => service !== null);

  // Fetch all domains
  const domains = await getDomains({ getAllVersions: true });

  // Filter domains with specifications and read spec content - only keep essential data
  const domainsWithSpecs = await Promise.all(
    domains.map(async (domain) => {
      try {
        const specifications = getSpecificationsForDomain(domain);

        if (specifications.length === 0) {
          return null;
        }

        return await Promise.all(
          specifications.map(async (spec) => {
            if (!resourceFileExists(domain, spec.path)) {
              return null;
            }

            const schemaExtension = spec.type;
            const enrichedOwners = await enrichOwners(domain.data.owners || []);

            return {
              collection: 'domains',
              data: {
                id: `${domain.data.id}`,
                name: `${domain.data.name} - ${spec.name}`,
                version: domain.data.version,
                summary: domain.data.summary,
                schemaPath: spec.path,
                owners: enrichedOwners,
              },
              loadDetails: () => ({ schemaContent: readResourceFile(domain, spec.path) ?? '', examples: [] }),
              schemaExtension,
              specType: spec.type,
              specName: spec.name,
              specFilenameWithoutExtension: spec.filenameWithoutExtension,
            };
          })
        );
      } catch (error) {
        console.error(`Error reading specifications for domain ${domain.data.id}:`, error);
        return null;
      }
    })
  );

  // Flatten and filter out null values for domains
  const flatDomainsWithSpecs = domainsWithSpecs.flat().filter((domain) => domain !== null);

  // Fetch all data products and extract contracts from outputs
  const dataProducts = await getDataProducts({ getAllVersions: true });

  // Filter data products with contracts in outputs and read contract content
  const dataProductsWithContracts = await Promise.all(
    dataProducts.map(async (dataProduct) => {
      try {
        const outputs = dataProduct.data.outputs || [];
        const outputsWithContracts = outputs.filter((output) => output.contract);

        if (outputsWithContracts.length === 0) {
          return null;
        }

        return await Promise.all(
          outputsWithContracts.map(async (output) => {
            const contract = output.contract!;
            if (!resourceFileExists(dataProduct, contract.path)) {
              return null;
            }

            const schemaExtension = path.extname(contract.path).slice(1) || 'json';
            const enrichedOwners = await enrichOwners(dataProduct.data.owners || []);

            return {
              collection: 'data-products',
              data: {
                id: `${dataProduct.data.id}__${contract.path}`,
                name: contract.name,
                version: dataProduct.data.version,
                summary: `Data contract for ${dataProduct.data.name}`,
                schemaPath: contract.path,
                owners: enrichedOwners,
              },
              loadDetails: () => ({ schemaContent: readResourceFile(dataProduct, contract.path) ?? '', examples: [] }),
              schemaExtension,
              contractType: contract.type,
              dataProductId: dataProduct.data.id,
              dataProductVersion: dataProduct.data.version,
            };
          })
        );
      } catch (error) {
        console.error(`Error reading contracts for data product ${dataProduct.data.id}:`, error);
        return null;
      }
    })
  );

  // Flatten and filter out null values for data product contracts
  const flatDataProductContracts = dataProductsWithContracts.flat().filter((contract) => contract !== null);

  return new Map(
    [...messagesWithSchemas, ...flatServicesWithSpecs, ...flatDomainsWithSpecs, ...flatDataProductContracts].map((entry) => {
      const { loadDetails, ...item } = entry;
      const key = createHash('sha256')
        .update(
          JSON.stringify([
            item.collection,
            item.data.id,
            item.data.version,
            item.data.schemaPath,
            'specType' in item ? item.specType : '',
          ])
        )
        .digest('hex');
      return [
        key,
        { item: { ...item, contentUrl: buildUrl(`/schemas/explorer/content/${key}.json`, true) } as SchemaItem, loadDetails },
      ];
    })
  );
}

// Share metadata during production rendering; dev rebuilds it to reflect content edits.
let registry: ReturnType<typeof buildRegistry> | undefined;
export const getSchemaRegistry = () => {
  if (import.meta.env.DEV || process.env.DISABLE_EVENTCATALOG_CACHE === 'true') return buildRegistry();
  return (registry ??= buildRegistry().catch((error) => {
    registry = undefined;
    throw error;
  }));
};
export const getSchemaMetadata = async (): Promise<SchemaItem[]> =>
  [...(await getSchemaRegistry()).values()].map(({ item }) => item);
export const getSchemaDetails = async (key: string): Promise<SchemaDetails | undefined> =>
  (await getSchemaRegistry()).get(key)?.loadDetails();
