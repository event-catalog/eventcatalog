import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { getEvents } from '@utils/collections/events';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import { getServices, getSpecificationsForService } from '@utils/collections/services';
import { getDomains, getSpecificationsForDomain } from '@utils/collections/domains';
import { getDataProducts } from '@utils/collections/data-products';
import { getOwner } from '@utils/collections/owners';
import { buildUrl } from '@utils/url-builder';
import { resourceFileExists, readResourceFile } from '@utils/resource-files';
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

// Helper function to transform hydrated producers/consumers to flat objects with collection
function transformProducersConsumers(items: any[]) {
  if (!items || items.length === 0) return [];

  return items.map((item) => {
    // Handle both hydrated CollectionEntry objects and flat {id, version} objects
    if (item.data) {
      // Hydrated CollectionEntry
      return {
        id: item.data.id,
        version: item.data.version,
        collection: item.collection,
      };
    }
    // Already flat object (fallback)
    return item;
  });
}

async function fetchAllSchemas() {
  // Fetch all messages
  const events = await getEvents({ getAllVersions: true });
  const commands = await getCommands({ getAllVersions: true });
  const queries = await getQueries({ getAllVersions: true });

  // Fetch all services
  const services = await getServices({ getAllVersions: true });

  // Combine all messages
  const allMessages = [...events, ...commands, ...queries];

  // Filter messages with schemas and read schema content - only keep essential data
  const messagesWithSchemas = await Promise.all(
    allMessages
      .filter((message) => message.data.schemaPath)
      .filter((message) => resourceFileExists(message, message.data.schemaPath ?? ''))
      .map(async (message) => {
        try {
          const schemaPath = message.data.schemaPath ?? '';
          const schemaContent = readResourceFile(message, schemaPath) ?? '';
          const schemaExtension = path.extname(schemaPath).slice(1);
          const enrichedOwners = await enrichOwners(message.data.owners || []);

          return {
            collection: message.collection,
            data: {
              id: message.data.id,
              name: message.data.name,
              version: message.data.version,
              summary: message.data.summary,
              schemaPath: message.data.schemaPath,
              producers: transformProducersConsumers(message.data.producers || []),
              consumers: transformProducersConsumers(message.data.consumers || []),
              owners: enrichedOwners,
            },
            schemaContent,
            schemaExtension,
          };
        } catch (error) {
          console.error(`Error reading schema for ${message.data.id}:`, error);
          const enrichedOwners = await enrichOwners(message.data.owners || []);
          return {
            collection: message.collection,
            data: {
              id: message.data.id,
              name: message.data.name,
              version: message.data.version,
              summary: message.data.summary,
              schemaPath: message.data.schemaPath,
              producers: transformProducersConsumers(message.data.producers || []),
              consumers: transformProducersConsumers(message.data.consumers || []),
              owners: enrichedOwners,
            },
            schemaContent: '',
            schemaExtension: 'json',
          };
        }
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

            const schemaContent = readResourceFile(service, spec.path) ?? '';
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
              schemaContent,
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

            const schemaContent = readResourceFile(domain, spec.path) ?? '';
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
              schemaContent,
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

            const schemaContent = readResourceFile(dataProduct, contract.path) ?? '';
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
              schemaContent,
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

  return [...messagesWithSchemas, ...flatServicesWithSpecs, ...flatDomainsWithSpecs, ...flatDataProductContracts];
}

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const allSchemas = await fetchAllSchemas();

    return [
      {
        params: {},
        props: {
          schemas: allSchemas,
        },
      },
    ];
  }

  protected static async fetchData(_params: any) {
    const allSchemas = await fetchAllSchemas();
    return {
      schemas: allSchemas,
    };
  }

  protected static hasValidProps(props: any): boolean {
    return props && props.schemas !== undefined;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Schema explorer not found',
    });
  }
}
