import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { getEvents } from '@utils/collections/events';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import { getServices, getSpecificationsForService } from '@utils/collections/services';
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
              producers: message.data.producers || [],
              consumers: message.data.consumers || [],
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
              producers: message.data.producers || [],
              consumers: message.data.consumers || [],
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

  return [...messagesWithSchemas, ...flatServicesWithSpecs];
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
